import connectDB from "./mongodb"
import Strategy, { type IStrategy } from "@/models/Strategy"
import Wallet, { type IWallet } from "@/models/Wallet"
import { getChainlinkStreams } from "./chainlink"
import { getCandleMinute, getCandleTimestamp } from "./utils"
import type { Crypto, PriceData } from "@/types"
import redis, { CACHE_KEYS } from "./redis"
import { TimedStrategyRunner } from "./strategies/timed-strategy"
import { polymarketBuilder } from "./polymarket-builder"
import type { ChangeStream } from "mongodb"

interface StrategyExecution {
  strategyId: string
  walletId: string
  crypto: Crypto
  runner: TimedStrategyRunner
}

class TradingEngine {
  private activeStrategies: Map<string, StrategyExecution> = new Map()
  private priceCallbacks: Map<Crypto, (data: PriceData) => void> = new Map()
  private strategyChangeStream: ChangeStream | null = null

  /**
   * Initialise le moteur de trading
   */
  async initialize() {
    try {
      await connectDB()
    } catch (error) {
      console.error("Failed to connect to database (non-fatal):", error)
      // Continuer même si la connexion DB échoue temporairement
      return
    }

    // Initialiser le client Polymarket Builder pour l'exécution des ordres
    // Cette opération est optionnelle et ne doit pas bloquer l'initialisation
    polymarketBuilder.initialize().catch((error) => {
      // Log silencieux - le builder peut être initialisé plus tard
      // console.error("Failed to initialize Polymarket Builder Client:", error)
    })

    try {
      await this.loadActiveStrategies()
      this.setupPriceSubscriptions()
      await this.watchStrategies()
    } catch (error) {
      console.error("Error loading strategies or setting up subscriptions (non-fatal):", error)
    }
  }

  /**
   * Charge les stratégies actives depuis la base de données
   */
  private async loadActiveStrategies() {
    const strategies = await Strategy.find({ enabled: true }).lean<Array<IStrategy & { _id: unknown }>>()

    console.info(`[Engine] Loading strategies: found ${strategies.length}`)

    if (!strategies.length) {
      this.activeStrategies.forEach((execution) => execution.runner.stop())
      this.activeStrategies.clear()
      console.info("[Engine] No active strategies detected – engine idle")
      return
    }

    const walletIds = Array.from(
      new Set(strategies.map((strategy) => String(strategy.walletId)))
    )

    const wallets = await Wallet.find({ _id: { $in: walletIds } }).lean<Array<IWallet & { _id: unknown }>>()
    const walletMap = new Map<string, IWallet & { _id: unknown }>(
      wallets.map((wallet) => [String(wallet._id), wallet])
    )

    const seen = new Set<string>()

    for (const strategy of strategies) {
      const strategyId = String(strategy._id)
      const walletId = String(strategy.walletId)
      const wallet = walletMap.get(walletId)

      if (!wallet) {
        console.warn(`TradingEngine: wallet ${walletId} not found for strategy ${strategyId}`)
        continue
      }

      const existing = this.activeStrategies.get(strategyId)
      if (existing) {
        existing.runner.updateStrategy(strategy as IStrategy & { _id: unknown })
        existing.runner.updateWallet(wallet as IWallet & { _id: unknown })
        existing.crypto = strategy.crypto
        existing.walletId = walletId
        seen.add(strategyId)
        console.info(`[Engine] Refreshed existing strategy ${strategyId} (${strategy.crypto})`)
        continue
      }

      const runner = new TimedStrategyRunner({
        strategy: strategy as IStrategy & { _id: unknown },
        wallet: wallet as IWallet & { _id: unknown },
      })

      this.activeStrategies.set(strategyId, {
        strategyId,
        walletId,
        crypto: strategy.crypto,
        runner,
      })

      seen.add(strategyId)
      console.info(`[Engine] Registered strategy ${strategyId} (${strategy.crypto})`)
    }

    const toRemove: string[] = []
    for (const [strategyId, execution] of Array.from(this.activeStrategies.entries())) {
      if (!seen.has(strategyId)) {
        execution.runner.stop()
        toRemove.push(strategyId)
      }
    }

    toRemove.forEach((strategyId) => this.activeStrategies.delete(strategyId))
    if (toRemove.length) {
      console.info(`[Engine] Removed ${toRemove.length} stale strategies`)
    }
  }

  /**
   * Configure les abonnements aux prix pour chaque crypto utilisée
   */
  private setupPriceSubscriptions() {
    const cryptos = new Set<Crypto>()

    this.activeStrategies.forEach((execution) => {
      cryptos.add(execution.crypto)
    })

    cryptos.forEach((crypto) => this.ensureSubscription(crypto))
  }

  /**
   * Gère les mises à jour de prix
   */
  private async handlePriceUpdate(crypto: Crypto, priceData: PriceData) {
    console.debug(`[Engine] Price update ${crypto}: $${priceData.price} @ ${new Date(priceData.timestamp).toISOString()}`)
    const currentCandle = getCandleTimestamp(priceData.timestamp)
    const minute = getCandleMinute(priceData.timestamp)

    // Si on est à la minute 0, capturer le prix d'ouverture
    if (minute === 0) {
      await redis.set(
        CACHE_KEYS.candleOpenPrice(crypto, currentCandle),
        priceData.price.toString(),
        { ex: 900 } // 15 minutes
      )
    }

    // Vérifier les stratégies pour cette crypto
    const relevantStrategies = Array.from(this.activeStrategies.values()).filter(
      (exec) => exec.crypto === crypto
    )

    for (const execution of relevantStrategies) {
      console.debug(`[Engine] Forwarding price update to strategy ${execution.strategyId}`)
      await execution.runner.handlePriceUpdate(priceData)
    }
  }

  /**
   * Ajoute une stratégie active
   */
  async addStrategy(strategyId: string) {
    const strategy = await Strategy.findById(strategyId).lean<(IStrategy & { _id: unknown }) | null>()
    if (!strategy || !strategy.enabled) {
      return
    }

    const wallet = await Wallet.findById(strategy.walletId).lean<(IWallet & { _id: unknown }) | null>()
    if (!wallet) {
      console.warn(`TradingEngine: wallet not found for strategy ${strategyId}`)
      return
    }

    const existing = this.activeStrategies.get(strategyId)
    if (existing) {
      existing.runner.updateStrategy(strategy)
      existing.runner.updateWallet(wallet)
      existing.crypto = strategy.crypto
      existing.walletId = String(strategy.walletId)
      this.ensureSubscription(strategy.crypto)
      console.info(`[Engine] Strategy ${strategyId} already active – refreshed configuration`)
      return
    }

    const runner = new TimedStrategyRunner({
      strategy: strategy as IStrategy & { _id: unknown },
      wallet: wallet as IWallet & { _id: unknown },
    })

    this.activeStrategies.set(strategyId, {
      strategyId,
      walletId: String(strategy.walletId),
      crypto: strategy.crypto,
      runner,
    })

    this.ensureSubscription(strategy.crypto)
    console.info(`[Engine] Strategy ${strategyId} (${strategy.crypto}) added at runtime`)
  }

  /**
   * Retire une stratégie active
   */
  async removeStrategy(strategyId: string) {
    const execution = this.activeStrategies.get(strategyId)
    if (execution) {
      execution.runner.stop()
      this.activeStrategies.delete(strategyId)

      this.cleanupSubscription(execution.crypto)
    }
  }

  private async watchStrategies() {
    if (this.strategyChangeStream) {
      return
    }

    const watchFn = (Strategy as unknown as { watch?: typeof Strategy.watch }).watch
    if (typeof watchFn !== "function") {
      console.warn("[Engine] Strategy.watch unavailable. Skipping change stream subscription.")
      return
    }

    try {
      this.strategyChangeStream = watchFn.call(Strategy, [], {
        fullDocument: "updateLookup",
      }) as ChangeStream

      this.strategyChangeStream.on("change", async (change: any) => {
        try {
          const operation = change?.operationType
          const fullDocument = change?.fullDocument
          const strategyId: string | undefined =
            fullDocument?._id?.toString() ?? change?.documentKey?._id?.toString()

          if (!strategyId) {
            return
          }

          switch (operation) {
            case "insert":
            case "replace":
            case "update": {
              const enabled = fullDocument?.enabled ?? false
              if (enabled) {
                await this.addStrategy(strategyId)
              } else {
                await this.removeStrategy(strategyId)
              }
              break
            }
            case "delete": {
              await this.removeStrategy(strategyId)
              break
            }
            case "invalidate":
              console.warn("[Engine] Strategy change stream invalidated. Restarting…")
              await this.restartStrategyWatch()
              break
            default:
              break
          }
        } catch (changeError) {
          console.error("[Engine] Error processing strategy change:", changeError)
        }
      })

      this.strategyChangeStream.on("error", async (err: any) => {
        console.error("[Engine] Strategy change stream error:", err)
        await this.restartStrategyWatch()
      })

      this.strategyChangeStream.on("close", async () => {
        console.warn("[Engine] Strategy change stream closed. Restarting…")
        await this.restartStrategyWatch()
      })

      console.info("[Engine] Strategy change stream started.")
    } catch (error) {
      console.error("[Engine] Failed to start strategy change stream:", error)
    }
  }

  private async restartStrategyWatch(delayMs: number = 5000) {
    if (this.strategyChangeStream) {
      try {
        await this.strategyChangeStream.close()
      } catch (closeError) {
        console.warn("[Engine] Error closing strategy change stream:", closeError)
      }
      this.strategyChangeStream = null
    }

    setTimeout(() => {
      void this.watchStrategies()
    }, delayMs)
  }

  /**
   * Arrête le moteur de trading
   */
  stop() {
    const chainlinkStreams = getChainlinkStreams()
    this.priceCallbacks.forEach((callback, crypto) => {
      chainlinkStreams.unsubscribe(crypto, callback)
    })
    this.priceCallbacks.clear()
    this.activeStrategies.forEach((execution) => execution.runner.stop())
    this.activeStrategies.clear()
    if (this.strategyChangeStream) {
      this.strategyChangeStream
        .close()
        .catch((error: any) => console.error("[Engine] Error closing strategy change stream:", error))
      this.strategyChangeStream = null
    }
  }

  private ensureSubscription(crypto: Crypto) {
    if (this.priceCallbacks.has(crypto)) {
      return
    }

    const callback = (data: PriceData) => {
      void this.handlePriceUpdate(crypto, data)
    }

    this.priceCallbacks.set(crypto, callback)
    const chainlinkStreams = getChainlinkStreams()
    chainlinkStreams.subscribe(crypto, callback)
    console.info(`[Engine] Subscribed to Chainlink feed for ${crypto}`)
  }

  private cleanupSubscription(crypto: Crypto) {
    const stillUsed = Array.from(this.activeStrategies.values()).some(
      (exec) => exec.crypto === crypto
    )

    if (stillUsed) {
      return
    }

    const callback = this.priceCallbacks.get(crypto)
    if (callback) {
      const chainlinkStreams = getChainlinkStreams()
      chainlinkStreams.unsubscribe(crypto, callback)
      this.priceCallbacks.delete(crypto)
      console.info(`[Engine] Unsubscribed from Chainlink feed for ${crypto}`)
    }
  }
}

// Singleton instance
export const tradingEngine = new TradingEngine()

