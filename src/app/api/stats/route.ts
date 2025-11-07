import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Trade from "@/models/Trade"
import Strategy from "@/models/Strategy"
import Wallet from "@/models/Wallet"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    await connectDB()

    // Get all strategies for this user
    const strategies = await Strategy.find({ userId }).lean()
    const strategyIds = strategies.map((s) => s._id)

    // Get all trades for these strategies
    const trades = await Trade.find({
      strategyId: { $in: strategyIds },
    })
      .sort({ executedAt: -1 })
      .lean()

    // Calculate stats
    let totalVolume = 0
    const totalOrders = trades.length

    trades.forEach((trade: any) => {
      // Volume = size * price
      const volume = trade.size * trade.price
      totalVolume += volume
    })

    // Get redeemable positions from wallet balance
    let redeemablePositions = 0
    const wallet = await Wallet.findOne({ userId }).lean()
    if (wallet) {
      // Try to get balance from the balance API endpoint
      // This is a simplified approach - in production, you'd query Polymarket directly
      // For now, we'll return 0 and let the frontend fetch it from the balance endpoint
      redeemablePositions = 0 // Will be fetched by the frontend from /api/wallets/[id]/balance
    }

    // Calculate PnL
    // This is a simplified calculation - actual PnL would need position tracking
    // For now, we'll calculate based on filled trades
    // Real PnL = (current market price - entry price) * position size for open positions
    // + realized PnL from closed positions
    let totalPnL = 0
    // TODO: Implement proper PnL calculation based on positions

    return NextResponse.json({
      success: true,
      stats: {
        totalPnL,
        totalVolume,
        totalOrders,
        redeemablePositions,
      },
    })
  } catch (error: any) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

