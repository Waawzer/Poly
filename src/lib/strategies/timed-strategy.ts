import type { Crypto, MarketData, PriceData, TradeSide } from "@/types"
import Trade from "@/models/Trade"
import redis, { CACHE_KEYS } from "@/lib/redis"
import { polymarketCLOB } from "@/lib/polymarket"
import { polymarketBuilder } from "@/lib/polymarket-builder"
import { getCandleMinute, getCandleTimestamp } from "@/lib/utils"

type StrategyDocumentLike = {
  _id: unknown
  userId: unknown
  walletId: unknown
  crypto: Crypto
  priceThreshold: number
  orderAmount: number
  orderPrice?: number | null
  tradingWindowStartMinute: number
  tradingWindowStartSecond: number
  buyUpOnly?: boolean
  tradingWindowEndMinute?: number | null
}

type WalletDocumentLike = {
  _id: unknown
  address: string
  safeWalletAddress?: string
  name?: string
}

interface TimedStrategyConfig {
  id: string
  userId: string
  walletId: string
  crypto: Crypto
  priceThreshold: number
  orderAmount: number
  orderPriceCents: number | null
  tradingWindowStartMinute: number
  tradingWindowStartSecond: number
  tradingWindowEndMinute: number
  buyUpOnly: boolean
}

interface TimedWalletConfig {
  id: string
  address: string
  safeWalletAddress?: string
  name?: string
}

interface WindowState {
  inWindow: boolean
  secondsRemaining: number | null
}

function normalizeId(value: unknown): string {
  if (typeof value === "string") {
    return value
  }
  if (value && typeof value === "object" && "toString" in value) {
    return (value as { toString: () => string }).toString()
  }
  return String(value ?? "")
}

function normalizeStrategy(doc: StrategyDocumentLike): TimedStrategyConfig {
  return {
    id: normalizeId(doc._id),
    userId: normalizeId(doc.userId),
    walletId: normalizeId(doc.walletId),
    crypto: doc.crypto,
    priceThreshold: Number(doc.priceThreshold) || 0,
    orderAmount: Number(doc.orderAmount) || 0,
    orderPriceCents:
      doc.orderPrice !== undefined && doc.orderPrice !== null
        ? Number(doc.orderPrice)
        : null,
    tradingWindowStartMinute: Math.max(0, Math.min(14, Number(doc.tradingWindowStartMinute) || 0)),
    tradingWindowStartSecond: Math.max(0, Math.min(59, Number(doc.tradingWindowStartSecond) || 0)),
    tradingWindowEndMinute:
      doc.tradingWindowEndMinute !== undefined && doc.tradingWindowEndMinute !== null
        ? Math.max(0, Math.min(14, Number(doc.tradingWindowEndMinute)))
        : 14,
    buyUpOnly: Boolean(doc.buyUpOnly),
  }
}

function normalizeWallet(doc: WalletDocumentLike): TimedWalletConfig {
  return {
    id: normalizeId(doc._id),
    address: doc.address,
    safeWalletAddress: doc.safeWalletAddress,
    name: doc.name,
  }
}

export interface TimedStrategyRunnerOptions {
  strategy: StrategyDocumentLike
  wallet: WalletDocumentLike
}

export class TimedStrategyRunner {
  private strategy: TimedStrategyConfig
  private wallet: TimedWalletConfig

  private currentCandleTimestamp: number | null = null
  private candleOpenPrice: number | null = null
  private currentMarket: MarketData | null = null
  private orderPlacedThisCandle = false
  private initialized = false

  private processing = false
  private pendingPriceData: PriceData | null = null

  private lastLoggedMinute: number | null = null
  private lastWindowLogBucket: number | null = null

  constructor(options: TimedStrategyRunnerOptions) {
    this.strategy = normalizeStrategy(options.strategy)
    this.wallet = normalizeWallet(options.wallet)
  }

  updateStrategy(strategy: StrategyDocumentLike) {
    this.strategy = normalizeStrategy(strategy)
  }

  updateWallet(wallet: WalletDocumentLike) {
    this.wallet = normalizeWallet(wallet)
  }

  resetState() {
    this.currentCandleTimestamp = null
    this.candleOpenPrice = null
    this.currentMarket = null
    this.orderPlacedThisCandle = false
    this.initialized = false
    this.lastLoggedMinute = null
    this.lastWindowLogBucket = null
  }

  stop() {
    this.resetState()
  }

  async handlePriceUpdate(priceData: PriceData) {
    if (this.processing) {
      this.pendingPriceData = priceData
      return
    }

    this.processing = true

    try {
      await this.processPriceUpdate(priceData)
    } catch (error) {
      console.error(
        `TimedStrategyRunner(${this.strategy.crypto} - ${this.strategy.id}) process error:`,
        error
      )
    } finally {
      this.processing = false
      if (this.pendingPriceData) {
        const next = this.pendingPriceData
        this.pendingPriceData = null
        await this.handlePriceUpdate(next)
      }
    }
  }

  private async processPriceUpdate(priceData: PriceData) {
    const candleTimestamp = getCandleTimestamp(priceData.timestamp)
    const minuteInCandle = getCandleMinute(priceData.timestamp)

    // Detect new candle
    if (this.currentCandleTimestamp === null || this.currentCandleTimestamp !== candleTimestamp) {
      await this.onNewCandle(candleTimestamp, minuteInCandle, priceData)
    }

    if (this.currentCandleTimestamp === null) {
      return
    }

    const openPrice = await this.ensureOpenPrice(priceData)
    if (openPrice === null) {
      // Wait for a reliable open price before trading
      return
    }

    if (!this.initialized) {
      // Waiting for the next full candle to initialize the strategy
      return
    }

    const windowState = this.getWindowState(priceData.timestamp)
    if (!windowState.inWindow) {
      return
    }

    if (this.orderPlacedThisCandle) {
      return
    }

    const market = await this.ensureMarket(this.currentCandleTimestamp)
    if (!market) {
      return
    }

    const priceDiff = priceData.price - openPrice
    const threshold = this.strategy.priceThreshold

    let side: TradeSide | null = null
    if (priceDiff >= threshold) {
      side = "UP"
    } else if (!this.strategy.buyUpOnly && priceDiff <= -threshold) {
      side = "DOWN"
    }

    this.logWindowState(priceData, priceDiff, windowState.secondsRemaining)

    if (!side) {
      return
    }

    await this.executeTrade({
      side,
      market,
      price: priceData.price,
      priceDiff,
    })
  }

  private async onNewCandle(
    candleTimestamp: number,
    minuteInCandle: number,
    priceData: PriceData
  ) {
    this.currentCandleTimestamp = candleTimestamp
    this.candleOpenPrice = null
    this.currentMarket = null
    this.orderPlacedThisCandle = false
    this.lastLoggedMinute = null
    this.lastWindowLogBucket = null

    if (minuteInCandle === 0) {
      await this.setOpenPrice(priceData)
      if (this.candleOpenPrice !== null) {
        this.initialized = true
      }
    } else if (!this.initialized) {
      console.warn(
        `TimedStrategyRunner(${this.strategy.crypto}) detected candle change at minute ${minuteInCandle}. Waiting for next full candle to initialize.`
      )
    }
  }

  private async ensureOpenPrice(priceData: PriceData): Promise<number | null> {
    if (this.candleOpenPrice !== null) {
      return this.candleOpenPrice
    }

    await this.setOpenPrice(priceData)
    return this.candleOpenPrice
  }

  private async setOpenPrice(priceData: PriceData) {
    if (this.currentCandleTimestamp === null) {
      return
    }

    const cacheKey = CACHE_KEYS.candleOpenPrice(this.strategy.crypto, this.currentCandleTimestamp)

    // Prefer the open price included in the price feed data
    if (typeof priceData.openPrice === "number" && !Number.isNaN(priceData.openPrice)) {
      this.candleOpenPrice = priceData.openPrice
      await redis.set(cacheKey, priceData.openPrice.toString(), { ex: 900 })
      return
    }

    // Check cache
    const cached = await redis.get<string>(cacheKey)
    if (cached !== null) {
      const parsed = parseFloat(cached)
      if (!Number.isNaN(parsed)) {
        this.candleOpenPrice = parsed
        return
      }
    }

    // Fallback: use current price as opening price when at minute 0
    const minuteInCandle = getCandleMinute(priceData.timestamp)
    if (minuteInCandle === 0) {
      this.candleOpenPrice = priceData.price
      await redis.set(cacheKey, priceData.price.toString(), { ex: 900 })
    }
  }

  private getWindowState(timestamp: number): WindowState {
    if (this.currentCandleTimestamp === null) {
      return { inWindow: false, secondsRemaining: null }
    }

    const date = new Date(timestamp)
    const minute = date.getMinutes() % 15
    const second = date.getSeconds()

    const startMinute = this.strategy.tradingWindowStartMinute
    const startSecond = this.strategy.tradingWindowStartSecond
    const endMinute = Math.min(14, Math.max(startMinute, this.strategy.tradingWindowEndMinute ?? 14))

    // Compute absolute timestamps for window boundaries
    const windowStart =
      this.currentCandleTimestamp + startMinute * 60 * 1000 + startSecond * 1000
    const windowEnd =
      this.currentCandleTimestamp + endMinute * 60 * 1000 + 59 * 1000 + 999

    if (timestamp < windowStart || timestamp > windowEnd) {
      return { inWindow: false, secondsRemaining: null }
    }

    let secondsRemaining: number | null = null
    if (minute === endMinute) {
      secondsRemaining = Math.max(0, 60 - second)
    } else {
      const minutesRemaining = endMinute - minute
      secondsRemaining = minutesRemaining * 60 + (60 - second)
    }

    return {
      inWindow: true,
      secondsRemaining,
    }
  }

  private async ensureMarket(candleTimestamp: number): Promise<MarketData | null> {
    if (this.currentMarket) {
      return this.currentMarket
    }

    try {
      const market = await polymarketCLOB.getMarket(this.strategy.crypto, candleTimestamp)
      if (!market) {
        console.debug(
          `TimedStrategyRunner(${this.strategy.crypto}) no active market for candle ${candleTimestamp}`
        )
        return null
      }

      if (!market.tokens?.yes || !market.tokens?.no) {
        console.warn(
          `TimedStrategyRunner(${this.strategy.crypto}) market ${market.id} missing token IDs`
        )
        return null
      }

      this.currentMarket = market
      return market
    } catch (error) {
      console.error(
        `TimedStrategyRunner(${this.strategy.crypto}) error fetching market:`,
        error
      )
      return null
    }
  }

  private async executeTrade({
    side,
    market,
    price,
    priceDiff,
  }: {
    side: TradeSide
    market: MarketData
    price: number
    priceDiff: number
  }) {
    if (!this.currentCandleTimestamp) {
      return
    }

    const orderPrice = await this.resolveOrderPrice(side, market)
    if (orderPrice === null) {
      console.warn(
        `TimedStrategyRunner(${this.strategy.crypto}) unable to determine order price for ${side}`
      )
      return
    }

    const tokenId = polymarketBuilder.getTokenId(
      market.tokens.yes,
      market.tokens.no,
      side
    )

    try {
      const hasAllowance = await polymarketBuilder.ensureAllowance(
        this.wallet.address,
        tokenId,
        this.strategy.orderAmount
      )

      if (!hasAllowance) {
        console.error(
          `TimedStrategyRunner(${this.strategy.crypto}) insufficient allowance for wallet ${this.wallet.address}`
        )
        await this.logTrade({
          marketId: market.id,
          side,
          price: orderPrice,
          status: "failed",
        })
        this.orderPlacedThisCandle = true
        return
      }

      console.info(
        `TimedStrategyRunner(${this.strategy.crypto}) placing ${side} order | diff=$${priceDiff.toFixed(
          2
        )} | open=$${this.candleOpenPrice?.toFixed(2) ?? "?"} | current=$${price.toFixed(2)}`
      )

      const orderResult = await polymarketBuilder.placeOrder(
        this.wallet.address,
        tokenId,
        side,
        orderPrice,
        this.strategy.orderAmount
      )

      await this.logTrade({
        marketId: market.id,
        side,
        price: orderPrice,
        status: orderResult.success ? "executed" : "failed",
      })

      this.orderPlacedThisCandle = true
    } catch (error: any) {
      console.error(
        `TimedStrategyRunner(${this.strategy.crypto}) error placing order ${side}:`,
        error
      )

      await this.logTrade({
        marketId: market.id,
        side,
        price: orderPrice,
        status: "failed",
      })

      this.orderPlacedThisCandle = true
    }
  }

  private async resolveOrderPrice(side: TradeSide, market: MarketData): Promise<number | null> {
    if (this.strategy.orderPriceCents !== null) {
      return this.strategy.orderPriceCents / 100
    }

    try {
      const ticker = await polymarketCLOB.getTicker(market.id)
      if (!ticker) {
        return null
      }

      const ask = typeof ticker.ask === "string" ? parseFloat(ticker.ask) : ticker.ask
      const bid = typeof ticker.bid === "string" ? parseFloat(ticker.bid) : ticker.bid

      if (side === "UP" && typeof ask === "number" && !Number.isNaN(ask)) {
        return ask
      }

      if (side === "DOWN" && typeof bid === "number" && !Number.isNaN(bid)) {
        return bid
      }

      return null
    } catch (error) {
      console.error(
        `TimedStrategyRunner(${this.strategy.crypto}) error fetching ticker for market ${market.id}:`,
        error
      )
      return null
    }
  }

  private async logTrade({
    marketId,
    side,
    price,
    status,
  }: {
    marketId: string
    side: TradeSide
    price: number
    status: string
  }) {
    try {
      await Trade.create({
        strategyId: this.strategy.id,
        marketId,
        side,
        price,
        size: this.strategy.orderAmount,
        status,
        executedAt: new Date(),
      } as any)
    } catch (error) {
      console.error(
        `TimedStrategyRunner(${this.strategy.crypto}) error logging trade for market ${marketId}:`,
        error
      )
    }
  }

  private logWindowState(priceData: PriceData, priceDiff: number, secondsRemaining: number | null) {
    if (this.currentCandleTimestamp === null) {
      return
    }

    const minute = getCandleMinute(priceData.timestamp)
    const secondBucket = Math.floor(new Date(priceData.timestamp).getSeconds() / 5)

    const shouldLog =
      this.lastLoggedMinute !== minute ||
      (secondsRemaining !== null && secondsRemaining <= 30 && this.lastWindowLogBucket !== secondBucket)

    if (!shouldLog) {
      return
    }

    this.lastLoggedMinute = minute
    this.lastWindowLogBucket = secondBucket

    const remainingLabel = secondsRemaining !== null ? `${secondsRemaining}s remaining` : ""
    const diffLabel = priceDiff >= 0 ? `+${priceDiff.toFixed(2)}` : priceDiff.toFixed(2)

    console.info(
      `📊 ${this.strategy.crypto} | minute ${minute.toString().padStart(2, "0")} | price=$${priceData.price.toFixed(
        2
      )} | diff=$${diffLabel} | threshold=±$${this.strategy.priceThreshold.toFixed(
        2
      )} ${remainingLabel}`
    )
  }
}


