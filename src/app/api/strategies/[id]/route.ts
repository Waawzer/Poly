import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Strategy from "@/models/Strategy"
import { tradingEngine } from "@/lib/trading-engine"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const updates = await request.json()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    await connectDB()

    // First check if strategy exists and belongs to user
    const strategy = await Strategy.findById(id)
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    // Verify the strategy belongs to the user (if userId is provided)
    if (userId && strategy.userId.toString() !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Update the strategy
    const updatedStrategy = await Strategy.findByIdAndUpdate(id, updates, { new: true })

    if (!updatedStrategy) {
      return NextResponse.json({ error: "Strategy not found after update" }, { status: 404 })
    }

    // Mettre à jour le moteur de trading
    if (updates.enabled !== undefined) {
      if (updates.enabled) {
        await tradingEngine.addStrategy(id)
      } else {
        await tradingEngine.removeStrategy(id)
      }
    }

    return NextResponse.json({
      success: true,
      strategy: {
        _id: updatedStrategy._id.toString(),
        userId: updatedStrategy.userId.toString(),
        walletId: updatedStrategy.walletId.toString(),
        crypto: updatedStrategy.crypto,
        priceThreshold: updatedStrategy.priceThreshold,
        orderAmount: updatedStrategy.orderAmount,
        orderPrice: updatedStrategy.orderPrice,
        tradingWindowStartMinute: updatedStrategy.tradingWindowStartMinute,
        tradingWindowStartSecond: updatedStrategy.tradingWindowStartSecond,
        buyUpOnly: updatedStrategy.buyUpOnly ?? false,
        enabled: updatedStrategy.enabled,
        createdAt: updatedStrategy.createdAt,
      },
    })
  } catch (error: any) {
    console.error("Error updating strategy:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    await connectDB()

    // First check if strategy exists and belongs to user
    const strategy = await Strategy.findById(id)
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    // Verify the strategy belongs to the user (if userId is provided)
    if (userId && strategy.userId.toString() !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete the strategy
    await Strategy.findByIdAndDelete(id)

    // Retirer la stratégie du moteur de trading
    await tradingEngine.removeStrategy(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting strategy:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

