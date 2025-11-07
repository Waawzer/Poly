import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Trade from "@/models/Trade"
import Strategy from "@/models/Strategy"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    await connectDB()

    // Verify strategy exists and belongs to user
    const strategy = await Strategy.findById(id)
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    if (userId && strategy.userId.toString() !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get all trades for this strategy
    const trades = await Trade.find({ strategyId: id })
      .sort({ executedAt: -1 })
      .lean()

    // Calculate stats
    const totalOrders = trades.length
    let totalPnL = 0

    // Calculate volume
    let totalVolume = 0
    trades.forEach((trade: any) => {
      const volume = trade.size * trade.price
      totalVolume += volume
    })

    // TODO: Calculate actual PnL based on positions
    // For now, return 0

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders,
        totalPnL,
        totalVolume,
      },
    })
  } catch (error: any) {
    console.error("Error fetching strategy stats:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

