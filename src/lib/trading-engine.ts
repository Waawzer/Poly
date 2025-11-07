import connectDB from "./mongodb"
import Strategy, { type IStrategy } from "@/models/Strategy"
import Trade from "@/models/Trade"
import Wallet, { type IWallet } from "@/models/Wallet"
import { getChainlinkStreams } from "./chainlink"
import { polymarketCLOB } from "./polymarket"
import { polymarketBuilder } from "./polymarket-builder"
import { getCandleTimestamp, getCandleMinute, isInTradingWindow } from "./utils"
import type { Crypto, PriceData, TradeSide } from "@/types"
import redis, { CACHE_KEYS } from "./redis"

interface StrategyExecution {
  strategyId: string
  walletId: string
  crypto: Crypto
  lastExecutedCandle: number | null
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
      // Continuer même en cas d'erreur
    }
  }

  /**
   * Charge les stratégies actives depuis la base de données
   */
  private async loadActiveStrategies() {
    const strategies = await Strategy.find({ enabled: true }).lean<Array<{
      _id: unknown
      walletId: unknown
      crypto: Crypto
    }>>()

    strategies.forEach((strategy) => {
      const strategyId = String(strategy._id)
      const walletId = String(strategy.walletId)

      this.activeStrategies.set(strategyId, {
        strategyId,
        walletId,
        crypto: strategy.crypto,
        lastExecutedCandle: null,
      })
    })
  }

  /**
   * Configure les abonnements aux prix pour chaque crypto utilisée
   */
  private setupPriceSubscriptions() {
    const cryptos = new Set<Crypto>()

    this.activeStrategies.forEach((execution) => {
      cryptos.add(execution.crypto)
    })

    cryptos.forEach((crypto) => {
      const callback = (data: PriceData) => this.handlePriceUpdate(crypto, data)
      this.priceCallbacks.set(crypto, callback)
      const chainlinkStreams = getChainlinkStreams()
      chainlinkStreams.subscribe(crypto, callback)
    })
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
      await this.evaluateStrategy(execution, priceData, currentCandle, minute)
    }
  }

  /**
   * Évalue une stratégie et exécute un trade si les conditions sont remplies
   */
  private async evaluateStrategy(
    execution: StrategyExecution,
    priceData: PriceData,
    candleTimestamp: number,
    minute: number
  ) {
    try {
      // Éviter les exécutions multiples pour la même bougie
      if (execution.lastExecutedCandle === candleTimestamp) {
        return
      }

      const strategy = await Strategy.findById(execution.strategyId).lean<(IStrategy & { _id: unknown }) | null>()
      if (!strategy || !strategy.enabled) {
        return
      }

      // Vérifier si on est dans la fenêtre de trading
      // Convertir la minute et seconde de début en timestamp relatif à la bougie
      const candleStartTime = candleTimestamp
      const strategyStartTime = candleStartTime + 
        (strategy.tradingWindowStartMinute * 60 * 1000) + 
        (strategy.tradingWindowStartSecond * 1000)
      
      // La stratégie est active à partir du timestamp de début jusqu'à la fin de la bougie
      if (priceData.timestamp < strategyStartTime) {
        return
      }

      // Récupérer le prix d'ouverture de la bougie
      const openPriceStr = await redis.get<string>(
        CACHE_KEYS.candleOpenPrice(strategy.crypto, candleTimestamp)
      )

      if (!openPriceStr) {
        // Si pas de prix d'ouverture, utiliser le prix actuel (première minute)
        if (minute === 0) {
          await redis.set(
            CACHE_KEYS.candleOpenPrice(strategy.crypto, candleTimestamp),
            priceData.price.toString(),
            { ex: 900 }
          )
          return // Attendre la prochaine mise à jour
        }
        return
      }

      const openPrice = parseFloat(openPriceStr)
      const priceDifference = priceData.price - openPrice
      const absPriceDifference = Math.abs(priceDifference)

      // Vérifier si la différence absolue atteint le seuil
      if (absPriceDifference < strategy.priceThreshold) {
        return
      }

      // Déterminer le côté du trade
      let side: TradeSide | null = null
      if (priceDifference >= strategy.priceThreshold) {
        side = "UP"
      } else if (!strategy.buyUpOnly && priceDifference <= -strategy.priceThreshold) {
        // Si buyUpOnly est false, on peut aussi trader DOWN
        side = "DOWN"
      }

      if (side) {
        await this.executeTrade(strategy, execution, side, candleTimestamp, priceData.price)
        execution.lastExecutedCandle = candleTimestamp
      }
    } catch (error) {
      console.error(`Error evaluating strategy ${execution.strategyId}:`, error)
    }
  }

  /**
   * Exécute un trade
   */
  private async executeTrade(
    strategy: any,
    execution: StrategyExecution,
    side: TradeSide,
    candleTimestamp: number,
    currentPrice: number
  ) {
    try {
      // Récupérer le wallet associé à la stratégie
      const wallet = await Wallet.findById(execution.walletId).lean<(IWallet & { _id: unknown }) | null>()
      if (!wallet) {
        console.error(`Wallet not found for strategy ${strategy._id}`)
        return
      }

      // Récupérer le marché
      const market = await polymarketCLOB.getMarket(strategy.crypto, candleTimestamp)
      if (!market) {
        console.error(`Market not found for ${strategy.crypto} at ${candleTimestamp}`)
        return
      }

      // Récupérer le ticker pour obtenir le prix du marché
      const ticker = await polymarketCLOB.getTicker(market.id)
      if (!ticker) {
        console.error(`Ticker not found for market ${market.id}`)
        return
      }

      // Utiliser le prix d'ordre défini dans la stratégie (en centimes, converti en dollars)
      // Si orderPrice n'est pas défini, utiliser le prix du marché comme fallback
      let orderPrice = 0.5
      if (strategy.orderPrice !== undefined && strategy.orderPrice !== null) {
        // Convertir de centimes en dollars (ex: 50 centimes = 0.50$)
        orderPrice = strategy.orderPrice / 100
      } else {
        // Fallback: utiliser le prix du marché
        if (side === "UP" && ticker.ask !== undefined) {
          orderPrice = ticker.ask
        } else if (side === "DOWN" && ticker.bid !== undefined) {
          orderPrice = ticker.bid
        }
      }

      // Obtenir le token ID pour le côté du trade
      const tokenId = polymarketBuilder.getTokenId(market.tokens.yes, market.tokens.no, side)

      // Vérifier l'allowance avant de placer l'ordre
      const hasAllowance = await polymarketBuilder.ensureAllowance(
        wallet.address,
        tokenId,
        strategy.orderAmount
      )

      if (!hasAllowance) {
        console.error(
          `Insufficient allowance for wallet ${wallet.address}. Order not placed.`
        )
        // Créer un trade avec le statut "failed" pour tracking
        await Trade.create({
          strategyId: strategy._id,
          marketId: market.id,
          side,
          price: orderPrice,
          size: strategy.orderAmount,
          status: "failed",
          executedAt: new Date(),
        })
        return
      }

      // Placer l'ordre sur Polymarket via le builder code
      const orderResult = await polymarketBuilder.placeOrder(
        wallet.address,
        tokenId,
        side,
        orderPrice,
        strategy.orderAmount
      )

      // Créer l'enregistrement de trade avec le résultat
      await Trade.create({
        strategyId: strategy._id,
        marketId: market.id,
        side,
        price: orderPrice,
        size: strategy.orderAmount,
        status: orderResult.success ? "executed" : "failed",
        executedAt: new Date(),
      })

    } catch (error) {
      console.error(`Error executing trade for strategy ${strategy._id}:`, error)
      // Enregistrer le trade comme échoué en cas d'erreur
      try {
        const market = await polymarketCLOB.getMarket(strategy.crypto, candleTimestamp)
        if (market) {
          await Trade.create({
            strategyId: strategy._id,
            marketId: market.id,
            side,
            price: 0,
            size: strategy.orderAmount,
            status: "failed",
            executedAt: new Date(),
          })
        }
      } catch (dbError) {
        console.error("Error saving failed trade to database:", dbError)
      }
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

    const strategyIdStr = String(strategy._id)
    const walletIdStr = String(strategy.walletId)

    const execution: StrategyExecution = {
      strategyId: strategyIdStr,
      walletId: walletIdStr,
      crypto: strategy.crypto,
      lastExecutedCandle: null,
    }

    this.activeStrategies.set(strategyIdStr, execution)

      // S'abonner au prix si nécessaire
    if (!this.priceCallbacks.has(strategy.crypto)) {
      const callback = (data: PriceData) => this.handlePriceUpdate(strategy.crypto, data)
      this.priceCallbacks.set(strategy.crypto, callback)
      const chainlinkStreams = getChainlinkStreams()
      chainlinkStreams.subscribe(strategy.crypto, callback)
    }
  }

  /**
   * Retire une stratégie active
   */
  async removeStrategy(strategyId: string) {
    const execution = this.activeStrategies.get(strategyId)
    if (execution) {
      this.activeStrategies.delete(strategyId)

      // Vérifier si d'autres stratégies utilisent cette crypto
      const otherStrategies = Array.from(this.activeStrategies.values()).filter(
        (exec) => exec.crypto === execution.crypto
      )

      if (otherStrategies.length === 0) {
        // Se désabonner du prix
        const callback = this.priceCallbacks.get(execution.crypto)
        if (callback) {
          const chainlinkStreams = getChainlinkStreams()
          chainlinkStreams.unsubscribe(execution.crypto, callback)
          this.priceCallbacks.delete(execution.crypto)
        }
      }
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
    this.activeStrategies.clear()
  }
}

// Singleton instance
export const tradingEngine = new TradingEngine()

