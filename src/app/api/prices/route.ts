import { NextRequest, NextResponse } from "next/server"
import { getChainlinkStreams } from "@/lib/chainlink"
import type { Crypto } from "@/types"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const crypto = searchParams.get("crypto") as Crypto | null

    if (crypto && !["BTC", "ETH", "XRP", "SOL"].includes(crypto)) {
      return NextResponse.json({ error: "Invalid crypto" }, { status: 400 })
    }

    const cryptos: Crypto[] = crypto ? [crypto] : (["BTC", "ETH", "XRP", "SOL"] as Crypto[])

    const prices: Record<string, any> = {}

    const chainlinkStreams = getChainlinkStreams()
    for (const c of cryptos) {
      const price = await chainlinkStreams.getLatestPrice(c)
      if (price) {
        prices[c] = price
      }
    }

    return NextResponse.json({
      success: true,
      prices,
    })
  } catch (error: any) {
    console.error("Error fetching prices:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

