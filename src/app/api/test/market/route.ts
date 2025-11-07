import { NextRequest, NextResponse } from "next/server"
import { polymarketCLOB } from "@/lib/polymarket"
import { getCandleTimestamp } from "@/lib/utils"
import type { Crypto } from "@/types"

/**
 * Route API de test pour vérifier la récupération des marchés Polymarket
 * 
 * GET /api/test/market?crypto=BTC&timestamp=1234567890
 * ou
 * GET /api/test/market?crypto=BTC (utilise le timestamp de la bougie actuelle)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cryptoParam = searchParams.get("crypto")
    const timestampParam = searchParams.get("timestamp")

    if (!cryptoParam) {
      return NextResponse.json(
        { error: "Parameter 'crypto' is required (BTC, ETH, XRP, SOL)" },
        { status: 400 }
      )
    }

    const crypto = cryptoParam.toUpperCase() as Crypto
    if (!["BTC", "ETH", "XRP", "SOL"].includes(crypto)) {
      return NextResponse.json(
        { error: "Invalid crypto. Must be BTC, ETH, XRP, or SOL" },
        { status: 400 }
      )
    }

    // Utiliser le timestamp fourni ou celui de la bougie actuelle
    let candleTimestamp: number
    if (timestampParam) {
      const ts = parseInt(timestampParam, 10)
      if (isNaN(ts)) {
        return NextResponse.json(
          { error: "Invalid timestamp parameter (must be a number in seconds)" },
          { status: 400 }
        )
      }
      // Normaliser le timestamp (en secondes)
      candleTimestamp = ts
    } else {
      // Utiliser la bougie actuelle (convertir en secondes si nécessaire)
      const now = Date.now()
      const tsSeconds = Math.floor(now / 1000)
      candleTimestamp = getCandleTimestamp(tsSeconds)
      // getCandleTimestamp attend un timestamp en secondes et retourne en secondes
    }

    // Générer le slug pour vérification
    const slug = polymarketCLOB.getMarketSlug(crypto, candleTimestamp)

    // Récupérer le marché
    const startTime = Date.now()
    const market = await polymarketCLOB.getMarket(crypto, candleTimestamp)
    const fetchTime = Date.now() - startTime

    // Retourner les résultats
    return NextResponse.json({
      success: true,
      test: {
        crypto,
        candleTimestamp,
        timestampDate: new Date(candleTimestamp * 1000).toISOString(),
        slug,
        marketFound: market !== null,
        fetchTimeMs: fetchTime,
        market: market
          ? {
              id: market.id,
              slug: market.slug,
              question: market.question,
              active: market.active,
              tokenYes: market.tokens.yes,
              tokenNo: market.tokens.no,
            }
          : null,
      },
      message: market
        ? "✅ Market found successfully!"
        : "❌ Market not found or not active. Note: Markets may not exist for past candles or future candles that haven't been created yet.",
      note: "If market is null, it could mean: 1) Market doesn't exist yet, 2) Market is closed/inactive, 3) Market slug format is incorrect",
    })
  } catch (error: any) {
    console.error("Error testing market retrieval:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

