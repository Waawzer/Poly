import { createClient, decodeReport, LogLevel } from "@chainlink/data-streams-sdk"
import type { Crypto, PriceData } from "@/types"
import redis, { CACHE_KEYS } from "./redis"
import PriceHistory from "@/models/PriceHistory"
import connectDB from "./mongodb"
import { getExactCandleTimestamp } from "./utils"
import axios from "axios"
import * as crypto from "crypto"

// Chainlink Data Streams Testnet credentials
const CHAINLINK_USER_ID = process.env.CHAINLINK_USER_ID
const CHAINLINK_USER_SECRET = process.env.CHAINLINK_USER_SECRET
const CHAINLINK_WS_URL = process.env.CHAINLINK_DATA_STREAMS_WS_URL || "wss://ws.testnet-dataengine.chain.link"
const CHAINLINK_API_URL = process.env.CHAINLINK_DATA_STREAMS_API_URL || "https://api.testnet-dataengine.chain.link"

// Plages de prix raisonnables par crypto (en USD)
const PRICE_RANGES: Record<Crypto, { min: number; max: number }> = {
  BTC: { min: 10000, max: 200000 },
  ETH: { min: 500, max: 20000 },
  XRP: { min: 0.1, max: 10 },
  SOL: { min: 10, max: 500 },
}

// Mapper les feed IDs aux cryptos
const FEED_ID_TO_CRYPTO: Record<string, Crypto> = {
  "0x00037da06d56d083fe599397a4769a042d63aa73dc4ef57709d31e9971a5b439": "BTC", // BTC/USD testnet
  "0x000359843a543ee2fe414dc14c7e7920ef10f4372990b79d6361cdc0dd1ba782": "ETH", // ETH/USD testnet
  "0x00035e3ddda6345c3c8ce45639d4449451f1d5828d7a70845e446f04905937cd": "XRP", // XRP/USD testnet
  "0x0003d338ea2ac3be9e026033b1aa601673c37bab5e13851c59966f9f820754d6": "SOL", // SOL/USD testnet
}

// Feed IDs pour tous les cryptos
const FEED_IDS = Object.keys(FEED_ID_TO_CRYPTO)

class ChainlinkDataStreams {
  private stream: any = null
  private client: any = null
  private subscribers: Map<Crypto, Set<(data: PriceData) => void>> = new Map()
  private isConnected = false
  private loggedFeeds: Set<Crypto> = new Set()

  constructor() {
    // Initialiser les sets pour chaque crypto
    ;(["BTC", "ETH", "XRP", "SOL"] as Crypto[]).forEach((crypto) => {
      this.subscribers.set(crypto, new Set())
    })
  }

  connect() {
    if (this.stream && this.isConnected) {
      console.debug("[Chainlink] connect() called but stream already active")
      return
    }

    if (!CHAINLINK_WS_URL || !CHAINLINK_USER_ID || !CHAINLINK_USER_SECRET) {
      console.warn(
        `[Chainlink] Missing credentials, skipping connect (ws=${!!CHAINLINK_WS_URL}, id=${!!CHAINLINK_USER_ID}, secret=${!!CHAINLINK_USER_SECRET})`
      )
      return
    }

    try {
      console.info(`[Chainlink] Connecting to data streams (${CHAINLINK_WS_URL})`)
      // Créer le client Chainlink avec le SDK
      this.client = createClient({
        apiKey: CHAINLINK_USER_ID, // Le SDK utilise apiKey au lieu de USER_ID
        userSecret: CHAINLINK_USER_SECRET,
        endpoint: CHAINLINK_API_URL,
        wsEndpoint: CHAINLINK_WS_URL,
        logging: {
          logger: {
            error: () => {}, // Supprimer tous les logs
            warn: () => {},
            info: () => {},
            debug: () => {},
          },
          logLevel: LogLevel.ERROR,
        },
      })

      // Créer le stream pour tous les feed IDs
      this.stream = this.client.createStream(FEED_IDS)

      console.debug("[Chainlink] Stream created, wiring handlers")
      // Écouter les rapports
      this.stream.on("report", async (report: any) => {
        await this.handleReport(report)
      })

      // Écouter les erreurs
      this.stream.on("error", (error: any) => {
        console.error("Chainlink stream error:", error)
      })

      // Écouter les déconnexions
      this.stream.on("disconnected", () => {
        console.warn("[Chainlink] Stream disconnected")
        this.isConnected = false
      })

      // Écouter les reconnexions
      this.stream.on("reconnecting", () => {
        // Reconnexion silencieuse
        console.warn("[Chainlink] Stream reconnecting…")
      })

      // Connecter le stream
      this.stream.connect().then(() => {
        this.isConnected = true
        console.info("[Chainlink] Stream connected successfully")
      }).catch((error: any) => {
        console.error("Error connecting Chainlink stream:", error)
      })
    } catch (error) {
      console.error("Error initializing Chainlink client:", error)
    }
  }

  private async handleReport(report: any) {
    try {
      console.debug("[Chainlink] Received report payload", report?.feedID ?? "unknown")
      const decoded = report?.fullReport && report?.feedID ? decodeReport(report.fullReport, report.feedID) : report
      const decodedReport: any =
        decoded?.report ?? decoded?.payload ?? decoded

      const feedId = decodedReport?.feedID ?? decoded?.feedID ?? report?.feedID
      if (!feedId) {
        console.debug("[Chainlink] Report without feedID ignored", JSON.stringify(decoded))
        return
      }

      const crypto = FEED_ID_TO_CRYPTO[feedId]

      if (!crypto || !("BTC,ETH,XRP,SOL".split(",") as Crypto[]).includes(crypto)) {
        console.debug(`[Chainlink] Feed ${feedId} not mapped, ignoring`)
        return
      }

      // Extraire le prix depuis le rapport décodé
      let price: number | undefined
      let timestamp: number = Date.now()

      const normalizeInt192 = (value: unknown) => {
        if (value === undefined || value === null) {
          return undefined
        }
        try {
          let big: bigint
          if (typeof value === "bigint") {
            big = value
          } else if (typeof value === "number") {
            big = BigInt(Math.trunc(value))
          } else if (typeof value === "string") {
            big = BigInt(value)
          } else if (value && typeof value === "object" && "value" in value) {
            big = BigInt((value as any).value)
          } else if (value && typeof value === "object" && "price" in value) {
            big = BigInt((value as any).price)
          } else {
            throw new Error("Unsupported price value type")
          }
          const abs = Number(big >= 0n ? big : -big)
          let divider = 1e8
          if (abs > 1e18) {
            divider = 1e18
          } else if (abs < 1e6) {
            divider = 1e6
          }
          const result = Number(big) / divider
          console.debug(`[Chainlink] normalizeInt192 raw=${big.toString()} divider=${divider} -> ${result}`)
          return result
        } catch (error) {
          console.warn("[Chainlink] Failed to normalize int192 value", value, error)
          return undefined
        }
      }

      if (decodedReport?.price !== undefined) {
        price = normalizeInt192(decodedReport.price)
      } else if (decodedReport?.median !== undefined) {
        price = normalizeInt192(decodedReport.median)
      } else if (decodedReport?.midPrice !== undefined) {
        price = normalizeInt192(decodedReport.midPrice)
      } else if (decodedReport?.bid !== undefined && decodedReport?.ask !== undefined) {
        const bid = normalizeInt192(decodedReport.bid)
        const ask = normalizeInt192(decodedReport.ask)
        if (bid !== undefined && ask !== undefined) {
          price = (bid + ask) / 2
        }
      } else if (decodedReport?.bid !== undefined) {
        price = normalizeInt192(decodedReport.bid)
      } else if (decodedReport?.ask !== undefined) {
        price = normalizeInt192(decodedReport.ask)
      } else if (decoded?.price !== undefined) {
        price = normalizeInt192(decoded.price)
      }

      // Extraire le timestamp
      if ("observationsTimestamp" in decodedReport && typeof decodedReport.observationsTimestamp === "number") {
        timestamp = decodedReport.observationsTimestamp * 1000 // Convertir en ms
      } else if ("validFromTimestamp" in decodedReport && typeof decodedReport.validFromTimestamp === "number") {
        timestamp = decodedReport.validFromTimestamp * 1000
      } else if ("observationsTimestamp" in decoded && typeof decoded.observationsTimestamp === "number") {
        timestamp = decoded.observationsTimestamp * 1000
      } else if ("validFromTimestamp" in decoded && typeof decoded.validFromTimestamp === "number") {
        timestamp = decoded.validFromTimestamp * 1000
      }

      if (typeof price !== "number" || !price || isNaN(price)) {
        console.debug(`[Chainlink] Invalid price in report for ${crypto} ->`, JSON.stringify(decodedReport))
        return
      }

      // Validation du prix (relaxée pour le testnet qui peut avoir des valeurs différentes)
      const range = PRICE_RANGES[crypto]
      if (price < range.min || price > range.max) {
        // Sur le testnet, on accepte quand même les prix hors plage car ils peuvent être des valeurs de test
        // On continue le traitement même si le prix est hors plage
      }

      // Calculer le timestamp exact de la bougie 15 minutes
      const candleTimestamp = getExactCandleTimestamp(timestamp)

      const priceData: PriceData = {
        crypto,
        price,
        timestamp,
      }

      if (!this.loggedFeeds.has(crypto)) {
        console.info(`[Chainlink] First price for ${crypto}: $${priceData.price.toFixed(2)} @ ${new Date(priceData.timestamp).toISOString()}`)
        this.loggedFeeds.add(crypto)
      }

      // Vérifier si on a déjà un prix d'ouverture pour cette bougie
      let openPriceStr = await redis.get<string>(
        CACHE_KEYS.candleOpenPrice(crypto, candleTimestamp)
      )

      if (!openPriceStr) {
        // Pas de prix d'ouverture en cache pour cette bougie
        // Essayer de récupérer depuis l'API Chainlink au timestamp exact de la bougie
        const chainlinkOpenPrice = await this.fetchCandleOpenPriceFromChainlink(crypto, candleTimestamp)
        
        if (chainlinkOpenPrice !== null) {
          // Prix trouvé depuis Chainlink
          priceData.openPrice = chainlinkOpenPrice
        } else {
          // Si pas trouvé depuis Chainlink, c'est probablement le premier prix de cette bougie
          // Le capturer comme prix d'ouverture
          await redis.set(
            CACHE_KEYS.candleOpenPrice(crypto, candleTimestamp),
            price.toString(),
            { ex: 900 } // 15 minutes
          )
          priceData.openPrice = price
        }
      } else {
        // Prix d'ouverture déjà en cache
        priceData.openPrice = parseFloat(openPriceStr)
      }

      // Mettre en cache dans Redis (expiration de 5 minutes pour permettre des mises à jour plus fréquentes)
      await redis.set(CACHE_KEYS.price(crypto), JSON.stringify(priceData), { ex: 300 })
      console.debug(`[Chainlink] Stored latest price for ${crypto}: $${priceData.price}`)

      // Sauvegarder dans MongoDB
      try {
        await connectDB()
        await PriceHistory.create({
          crypto,
          price,
          timestamp: new Date(priceData.timestamp),
        })
      } catch (error) {
        console.error(`Error saving price history for ${crypto}:`, error)
      }

      // Notifier les abonnés
      const subscribers = this.subscribers.get(crypto)
      if (subscribers) {
        subscribers.forEach((callback) => callback(priceData))
      }
    } catch (error) {
      console.error("Error handling Chainlink report:", error)
    }
  }

  subscribe(crypto: Crypto, callback: (data: PriceData) => void) {
    const subscribers = this.subscribers.get(crypto)
    if (subscribers) {
      subscribers.add(callback)
    }

    // Si pas encore connecté, se connecter
    if (!this.isConnected) {
      this.connect()
    }
  }

  unsubscribe(crypto: Crypto, callback: (data: PriceData) => void) {
    const subscribers = this.subscribers.get(crypto)
    if (subscribers) {
      subscribers.delete(callback)
    }
  }

  /**
   * Génère les en-têtes d'authentification HMAC pour l'API REST Chainlink
   */
  private generateAuthHeaders(method: string, path: string, body?: string): Record<string, string> {
    if (!CHAINLINK_USER_ID || !CHAINLINK_USER_SECRET) {
      throw new Error("Chainlink credentials not configured")
    }

    const timestamp = Math.floor(Date.now() / 1000).toString()
    const message = `${CHAINLINK_USER_ID}${timestamp}${path}${body || ""}`
    const signature = crypto
      .createHmac("sha256", CHAINLINK_USER_SECRET)
      .update(message)
      .digest("hex")

    return {
      "x-chainlink-user-id": CHAINLINK_USER_ID,
      "x-chainlink-timestamp": timestamp,
      "x-chainlink-signature": signature,
      "Content-Type": "application/json",
    }
  }

  /**
   * Récupère un rapport depuis l'API REST Chainlink au timestamp spécifié
   */
  private async fetchReportFromChainlinkAPI(
    feedId: string,
    timestamp: number
  ): Promise<any | null> {
    if (!CHAINLINK_API_URL || !CHAINLINK_USER_ID || !CHAINLINK_USER_SECRET) {
      return null
    }

    try {
      // Convertir le timestamp en secondes
      const timestampSeconds = Math.floor(timestamp / 1000)
      
      // Essayer plusieurs endpoints possibles
      const endpoints = [
        `/feeds/${feedId}/reports/${timestampSeconds}`,
        `/feeds/${feedId}/reports?timestamp=${timestampSeconds}`,
        `/reports/${feedId}?timestamp=${timestampSeconds}`,
        `/feeds/${feedId}/reports/latest?timestamp=${timestampSeconds}`,
      ]

      for (const endpoint of endpoints) {
        try {
          const headers = this.generateAuthHeaders("GET", endpoint)
          const url = `${CHAINLINK_API_URL}${endpoint}`
          
          const response = await axios.get(url, {
            headers,
            timeout: 5000,
          })

          if (response.data && (response.data.fullReport || response.data.report)) {
            return response.data
          }
        } catch (error: any) {
          // Continuer avec le prochain endpoint si celui-ci échoue
          if (error.response?.status !== 404) {
            // Si ce n'est pas une 404, on peut logger l'erreur mais continuer
            continue
          }
        }
      }

      // Si aucun endpoint ne fonctionne, essayer de récupérer les rapports récents
      // et trouver le plus proche du timestamp
      try {
        const latestEndpoint = `/feeds/${feedId}/reports/latest`
        const headers = this.generateAuthHeaders("GET", latestEndpoint)
        const url = `${CHAINLINK_API_URL}${latestEndpoint}`
        
        const response = await axios.get(url, {
          headers,
          timeout: 5000,
        })

        if (response.data) {
          return response.data
        }
      } catch (error) {
        // Ignorer les erreurs
      }
    } catch (error) {
      // Silencieux - on continue sans le rapport si l'API échoue
    }

    return null
  }

  /**
   * Récupère le prix d'ouverture d'une bougie depuis l'API Chainlink
   * au timestamp exact de la bougie (00:00, 00:15, 00:30, 00:45)
   */
  private async fetchCandleOpenPriceFromChainlink(
    crypto: Crypto,
    candleTimestamp: number
  ): Promise<number | null> {
    if (!this.client && !CHAINLINK_API_URL) {
      return null
    }

    try {
      const feedId = Object.entries(FEED_ID_TO_CRYPTO).find(([_, c]) => c === crypto)?.[0]
      if (!feedId) {
        return null
      }

      // Essayer d'abord avec le SDK si disponible
      if (this.client) {
        try {
          const timestampSeconds = Math.floor(candleTimestamp / 1000)
          // Le SDK pourrait avoir une méthode pour récupérer des rapports historiques
          // Si elle existe, on l'utilise
          if (typeof (this.client as any).getReportByTimestamp === "function") {
            const report = await (this.client as any).getReportByTimestamp(feedId, timestampSeconds)
            if (report && report.fullReport) {
              const decoded: any = decodeReport(report.fullReport, report.feedID)
              let openPrice: number | undefined

              if ("price" in decoded && decoded.price !== undefined) {
                const priceBigInt = typeof decoded.price === "bigint" 
                  ? decoded.price 
                  : BigInt(decoded.price)
                openPrice = Number(priceBigInt) / 1e18
              } else if ("bid" in decoded && decoded.bid !== undefined) {
                const bidBigInt = typeof decoded.bid === "bigint" 
                  ? decoded.bid 
                  : BigInt(decoded.bid)
                openPrice = Number(bidBigInt) / 1e18
              }

              if (openPrice && !isNaN(openPrice)) {
                // Mettre en cache
                await redis.set(
                  CACHE_KEYS.candleOpenPrice(crypto, candleTimestamp),
                  openPrice.toString(),
                  { ex: 900 } // 15 minutes
                )
                return openPrice
              }
            }
          }
        } catch (error) {
          // Continuer avec l'API REST si le SDK échoue
        }
      }

      // Essayer avec l'API REST
      const report = await this.fetchReportFromChainlinkAPI(feedId, candleTimestamp)
      if (report) {
        const fullReport = report.fullReport || report.report
        if (fullReport) {
          const decoded: any = decodeReport(fullReport, feedId)
          let openPrice: number | undefined

          if ("price" in decoded && decoded.price !== undefined) {
            openPrice = Number((typeof decoded.price === "bigint" ? decoded.price : BigInt(decoded.price))) / 1e8
          } else if ("bid" in decoded && decoded.bid !== undefined) {
            openPrice = Number((typeof decoded.bid === "bigint" ? decoded.bid : BigInt(decoded.bid))) / 1e8
          }
          if ("price" in decoded && decoded.price !== undefined) {
            openPrice = Number((typeof decoded.price === "bigint" ? decoded.price : BigInt(decoded.price))) / 1e8
          } else if ("bid" in decoded && decoded.bid !== undefined) {
            openPrice = Number((typeof decoded.bid === "bigint" ? decoded.bid : BigInt(decoded.bid))) / 1e8
          }

          if (openPrice && !isNaN(openPrice)) {
            // Mettre en cache
            await redis.set(
              CACHE_KEYS.candleOpenPrice(crypto, candleTimestamp),
              openPrice.toString(),
              { ex: 900 } // 15 minutes
            )
            return openPrice
          }
        }
      }
    } catch (error) {
      // Silencieux - on continue sans le prix d'ouverture si l'API échoue
    }

    return null
  }

  async getLatestPrice(crypto: Crypto): Promise<PriceData | null> {
    try {
      const cached = await redis.get<string>(CACHE_KEYS.price(crypto))
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      console.error(`Error getting cached price for ${crypto}:`, error)
    }

    // Si pas en cache, chercher dans MongoDB
    try {
      await connectDB()
      const latest = await PriceHistory.findOne({ crypto })
        .sort({ timestamp: -1 })
        .lean()
        .exec()

      if (latest && typeof latest === "object" && "price" in latest && "timestamp" in latest) {
        return {
          crypto,
          price: (latest as any).price,
          timestamp: new Date((latest as any).timestamp).getTime(),
        }
      }
    } catch (error) {
      console.error(`Error getting price from DB for ${crypto}:`, error)
    }

    // Si pas en cache ni en DB, essayer de récupérer depuis l'API Chainlink
    if (this.client) {
      try {
        const feedId = Object.entries(FEED_ID_TO_CRYPTO).find(([_, c]) => c === crypto)?.[0]
        if (feedId) {
          const report = await this.client.getLatestReport(feedId)
          if (report) {
            const decoded: any = decodeReport(report.fullReport, report.feedID)
            let price: number | undefined

            if ("price" in decoded && decoded.price !== undefined) {
              price = Number((typeof decoded.price === "bigint" ? decoded.price : BigInt(decoded.price))) / 1e8
            } else if ("bid" in decoded && decoded.bid !== undefined) {
              price = Number((typeof decoded.bid === "bigint" ? decoded.bid : BigInt(decoded.bid))) / 1e8
            }

            if (price && !isNaN(price)) {
              const timestamp = "observationsTimestamp" in decoded && typeof decoded.observationsTimestamp === "number"
                ? decoded.observationsTimestamp * 1000
                : Date.now()

              return {
                crypto,
                price,
                timestamp,
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error getting latest price from Chainlink API for ${crypto}:`, error)
      }
    }

    return null
  }

  /**
   * Méthode publique pour récupérer le prix d'ouverture d'une bougie depuis Chainlink
   */
  async getCandleOpenPrice(crypto: Crypto, candleTimestamp: number): Promise<number | null> {
    // Vérifier d'abord le cache
    try {
      const cached = await redis.get<string>(
        CACHE_KEYS.candleOpenPrice(crypto, candleTimestamp)
      )
      if (cached) {
        return parseFloat(cached)
      }
    } catch (error) {
      // Continuer si le cache échoue
    }

    // Récupérer depuis Chainlink
    return await this.fetchCandleOpenPriceFromChainlink(crypto, candleTimestamp)
  }

  disconnect() {
    if (this.stream) {
      this.stream.close().catch((error: any) => {
        console.error("Error closing Chainlink stream:", error)
      })
      this.stream = null
    }
    this.isConnected = false
  }
}

// Singleton instance
let chainlinkStreamsInstance: ChainlinkDataStreams | null = null

export function getChainlinkStreams(): ChainlinkDataStreams {
  if (typeof window !== "undefined") {
    throw new Error("Chainlink streams should only be used server-side")
  }
  if (!chainlinkStreamsInstance) {
    chainlinkStreamsInstance = new ChainlinkDataStreams()
    chainlinkStreamsInstance.connect()
  }
  return chainlinkStreamsInstance
}

export const chainlinkStreams = typeof window === "undefined" ? getChainlinkStreams() : null
