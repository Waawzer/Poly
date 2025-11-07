import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Trade from "@/models/Trade"
import Strategy from "@/models/Strategy"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const strategyId = searchParams.get("strategyId")
    const limit = parseInt(searchParams.get("limit") || "50")

    await connectDB()

    const query: any = {}
    if (strategyId) {
      query.strategyId = strategyId
      // If userId is provided, verify the strategy belongs to the user
      if (userId) {
        const strategy = await Strategy.findById(strategyId)
        if (!strategy || strategy.userId.toString() !== userId) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }
      }
    } else if (userId) {
      // If only userId is provided, get all strategies for this user and fetch their trades
      const strategies = await Strategy.find({ userId })
      const strategyIds = strategies.map((s) => s._id)
      query.strategyId = { $in: strategyIds }
    }

    const trades = await Trade.find(query)
      .sort({ executedAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({
      success: true,
      trades: trades.map((trade) => ({
        _id: String(trade._id),
        strategyId: String(trade.strategyId),
        marketId: trade.marketId,
        side: trade.side,
        price: trade.price,
        size: trade.size,
        status: trade.status,
        executedAt: trade.executedAt,
      })),
    })
  } catch (error: any) {
    console.error("Error fetching trades:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

