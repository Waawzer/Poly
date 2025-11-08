import axios from "axios"
import type { Crypto, MarketData, TradeSide } from "@/types"
import { getCandleTimestamp } from "./utils"
import redis, { CACHE_KEYS } from "./redis"

const POLYMARKET_CLOB_API_URL = process.env.POLYMARKET_CLOB_API_URL || process.env.POLYMARKET_CLOB_HOST || "https://clob.polymarket.com"
const POLYMARKET_SUBGRAPH_URL = process.env.POLYMARKET_SUBGRAPH_URL || "https://api.thegraph.com/subgraphs/name/polymarket/matic"
const POLYMARKET_GAMMA_HOST = "https://gamma-api.polymarket.com"
const GAMMA_EVENT_SLUG_ENDPOINT = `${POLYMARKET_GAMMA_HOST}/events/slug`
const GAMMA_MARKET_SLUG_ENDPOINT = `${POLYMARKET_GAMMA_HOST}/markets/slug`

class PolymarketCLOB {
  private baseURL: string
  private missingMarketNotified: Set<string> = new Set()

  constructor() {
    this.baseURL = POLYMARKET_CLOB_API_URL
  }

  private normalizeTimestampSeconds(timestamp: number): number {
    // If timestamp looks like milliseconds, convert to seconds
    if (timestamp > 1e12) {
      return Math.floor(timestamp / 1000)
    }
    return timestamp
  }

  /**
   * Génère le slug du marché pour une crypto et une bougie 15m
   * Format: {crypto_lower}-updown-15m-{timestamp}
   */
  getMarketSlug(crypto: Crypto, candleTimestamp: number): string {
    const cryptoLower = crypto.toLowerCase()
    const timestampSeconds = this.normalizeTimestampSeconds(candleTimestamp)
    return `${cryptoLower}-updown-15m-${timestampSeconds}`
  }

  /**
   * Récupère un marché complet en combinant les endpoints events et markets de l'API Gamma
   */
  private async fetchMarketBySlug(slug: string): Promise<any | null> {
    try {
      // Step 1: Get event data (active, closed status)
      const eventUrl = `${GAMMA_EVENT_SLUG_ENDPOINT}/${slug}`
      const eventResp = await axios.get(eventUrl, { timeout: 10000 })

      if (eventResp.status === 404) {
        return null
      }

      const eventData = eventResp.data

      // Step 2: Get market data (clobTokenIds)
      const marketUrl = `${GAMMA_MARKET_SLUG_ENDPOINT}/${slug}`
      const marketResp = await axios.get(marketUrl, { timeout: 10000 })

      if (marketResp.status === 404) {
        return null
      }

      const marketData = marketResp.data

      // Step 3: Parse clobTokenIds (comes as JSON string, not array)
      let clobTokenIds: string[] = []
      const clobTokenIdsRaw = marketData.clobTokenIds || []

      if (typeof clobTokenIdsRaw === 'string') {
        try {
          clobTokenIds = JSON.parse(clobTokenIdsRaw)
        } catch (parseError) {
          console.error(`Failed to parse clobTokenIds JSON: ${parseError}`)
          return null
        }
      } else if (Array.isArray(clobTokenIdsRaw)) {
        clobTokenIds = clobTokenIdsRaw
      }

      if (clobTokenIds.length < 2) {
        return null
      }

      // Create complete market structure
      return {
        id: marketData.id,
        question: marketData.question || "",
        conditionId: marketData.conditionId,
        slug: slug,
        active: eventData.active || false,
        closed: eventData.closed || true,
        title: eventData.title || "",
        description: eventData.description || "",
        liquidity: marketData.liquidity || "0",
        startDate: marketData.startDate,
        endDate: marketData.endDate,
        tokens: [
          { id: clobTokenIds[0], outcome: "Up" },
          { id: clobTokenIds[1], outcome: "Down" }
        ],
        clobTokenIds: clobTokenIds,
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      console.error(`Error fetching market by slug ${slug}:`, error.message)
      return null
    }
  }

  /**
   * Récupère les informations d'un marché via l'API Gamma Polymarket
   * Utilise les endpoints /events/slug et /markets/slug pour obtenir toutes les informations
   */
  async getMarket(crypto: Crypto, candleTimestamp: number): Promise<MarketData | null> {
    const normalizedTimestamp = this.normalizeTimestampSeconds(candleTimestamp)
    const cacheKey = CACHE_KEYS.market(crypto, normalizedTimestamp)

    try {
      // Vérifier le cache
      const cached = await redis.get<string>(cacheKey)
      if (cached !== null) {
        // Si le cache contient "null" (string), retourner null
        if (cached === "null") {
          return null
        }
        // Sinon, parser le JSON
        try {
          const parsed = JSON.parse(cached)
          return parsed
        } catch {
          // Si le parsing échoue, ignorer le cache et continuer
        }
      }

      const slug = this.getMarketSlug(crypto, normalizedTimestamp)

      // Récupérer le marché via l'API Gamma
      const completeMarket = await this.fetchMarketBySlug(slug)

      if (!completeMarket) {
        if (!this.missingMarketNotified.has(slug)) {
          this.missingMarketNotified.add(slug)
          console.info(
            `[Polymarket] Market missing for slug ${slug}. No active Up/Down 15m market detected for ${crypto} at ${new Date(
              candleTimestamp
            ).toISOString()}`
          )
        }
        // Marché non trouvé - mettre en cache avec expiration courte pour éviter trop de requêtes
        await redis.set(cacheKey, "null", { ex: 60 }) // Cache null pour 1 minute
        return null
      }

      // Vérifier que le marché est actif et non fermé
      if (!completeMarket.active || completeMarket.closed) {
        if (!this.missingMarketNotified.has(`${slug}-inactive`)) {
          this.missingMarketNotified.add(`${slug}-inactive`)
          console.warn(
            `[Polymarket] Market ${slug} found but inactive (active=${completeMarket.active}, closed=${completeMarket.closed}).`
          )
        }
        // Marché inactif - mettre en cache avec expiration courte
        await redis.set(cacheKey, "null", { ex: 300 }) // Cache null pour 5 minutes
        return null
      }

      // Convertir au format MarketData
      const market: MarketData = {
        id: completeMarket.id || completeMarket.conditionId || "",
        slug: completeMarket.slug || slug,
        question: completeMarket.question || `${crypto} price 15m candle`,
        active: completeMarket.active,
        tokens: {
          yes: completeMarket.clobTokenIds[0] || "",
          no: completeMarket.clobTokenIds[1] || "",
        },
      }

      // Mettre en cache (1 heure)
      await redis.set(cacheKey, JSON.stringify(market), { ex: 3600 })

      return market
    } catch (error) {
      console.error(`Error fetching market for ${crypto} at ${candleTimestamp}:`, error)
      return null
    }
  }

  /**
   * Récupère le ticker (orderbook) d'un marché
   */
  async getTicker(marketId: string) {
    try {
      const response = await axios.get(`${this.baseURL}/ticker/${marketId}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching ticker for market ${marketId}:`, error)
      return null
    }
  }

  /**
   * Place un ordre d'achat
   */
  async buyOrder(
    marketId: string,
    side: TradeSide,
    price: number,
    size: number,
    signature: string,
    walletAddress: string
  ) {
    try {
      const response = await axios.post(
        `${this.baseURL}/orders`,
        {
          market_id: marketId,
          side: side === "UP" ? "buy_up" : "buy_down",
          price,
          size,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${signature}`,
            "X-Wallet-Address": walletAddress,
          },
        }
      )

      return response.data
    } catch (error: any) {
      console.error("Error placing order:", error.response?.data || error.message)
      throw error
    }
  }

  /**
   * Récupère le marché actuel pour une crypto
   */
  async getCurrentMarket(crypto: Crypto): Promise<MarketData | null> {
    const currentCandle = getCandleTimestamp(Date.now())
    return this.getMarket(crypto, currentCandle)
  }

  /**
   * Vérifie si un marché est valide pour le trading
   */
  async validateMarket(market: MarketData): Promise<boolean> {
    if (!market.active) {
      return false
    }

    if (!market.tokens.yes || !market.tokens.no) {
      return false
    }

    // Vérifier que l'orderbook existe
    const ticker = await this.getTicker(market.id)
    if (!ticker || !ticker.bid || !ticker.ask) {
      return false
    }

    return true
  }
}

export const polymarketCLOB = new PolymarketCLOB()

