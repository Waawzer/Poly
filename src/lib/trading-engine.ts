import connectDB from "./mongodb"
import Strategy, { type IStrategy } from "@/models/Strategy"
import Wallet, { type IWallet } from "@/models/Wallet"
import { getChainlinkStreams } from "./chainlink"
import { getCandleMinute, getCandleTimestamp } from "./utils"
import type { Crypto, PriceData } from "@/types"
import redis, { CACHE_KEYS } from "./redis"
import { TimedStrategyRunner } from "./strategies/timed-strategy"
import { polymarketBuilder } from "./polymarket-builder"

interface StrategyExecution {
  strategyId: string
  walletId: string
  crypto: Crypto
  runner: TimedStrategyRunner
}

class TradingEngine {
  private activeStrategies: Map<string, StrategyExecution> = new Map()
  private priceCallbacks: Map<Crypto, (data: PriceData) => void> = new Map()

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
    } catch (error) {
      console.error("Error loading strategies or setting up subscriptions (non-fatal):", error)
    }
  }

  /**
   * Charge les stratégies actives depuis la base de données
   */
  private async loadActiveStrategies() {
    const strategies = await Strategy.find({ enabled: true }).lean<Array<IStrategy & { _id: unknown }>>()

    if (!strategies.length) {
      this.activeStrategies.forEach((execution) => execution.runner.stop())
      this.activeStrategies.clear()
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
    }

    const toRemove: string[] = []
    for (const [strategyId, execution] of Array.from(this.activeStrategies.entries())) {
      if (!seen.has(strategyId)) {
        execution.runner.stop()
        toRemove.push(strategyId)
      }
    }

    toRemove.forEach((strategyId) => this.activeStrategies.delete(strategyId))
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
    }
  }
}

// Singleton instance
export const tradingEngine = new TradingEngine()

