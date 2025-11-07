import { NextRequest, NextResponse } from "next/server"
import { getExactCandleTimestamp } from "@/lib/utils"
import redis, { CACHE_KEYS } from "@/lib/redis"
import { getChainlinkStreams } from "@/lib/chainlink"
import type { Crypto } from "@/types"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const crypto = searchParams.get("crypto") as Crypto | null
    const timestampParam = searchParams.get("timestamp")

    if (!crypto || !["BTC", "ETH", "XRP", "SOL"].includes(crypto)) {
      return NextResponse.json({ error: "Invalid crypto" }, { status: 400 })
    }

    const candleTimestamp = timestampParam
      ? parseInt(timestampParam)
      : getExactCandleTimestamp(Date.now())

    // Vérifier le cache Redis pour le prix d'ouverture
    try {
      const cached = await redis.get<string>(
        CACHE_KEYS.candleOpenPrice(crypto, candleTimestamp)
      )
      if (cached) {
        return NextResponse.json({
          success: true,
          openPrice: parseFloat(cached),
          candleTimestamp,
        })
      }
    } catch (error) {
      console.error("Error getting cached open price:", error)
    }

    // Si pas en cache, récupérer depuis Chainlink
    try {
      const chainlinkStreams = getChainlinkStreams()
      const openPrice = await chainlinkStreams.getCandleOpenPrice(crypto, candleTimestamp)
      if (openPrice !== null) {
        return NextResponse.json({
          success: true,
          openPrice,
          candleTimestamp,
        })
      }
    } catch (error) {
      console.error("Error getting open price from Chainlink:", error)
    }

    // Si pas trouvé, retourner null
    return NextResponse.json({
      success: true,
      openPrice: null,
      candleTimestamp,
    })
  } catch (error: any) {
    console.error("Error fetching candle open price:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

