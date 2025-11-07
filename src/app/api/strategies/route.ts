import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Strategy from "@/models/Strategy"
import { tradingEngine } from "@/lib/trading-engine"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    await connectDB()

    // Only return strategies for the specified user
    const strategies = await Strategy.find({ userId }).lean()

    return NextResponse.json({
      success: true,
      strategies: strategies.map((strategy: any) => ({
        _id: strategy._id.toString(),
        userId: strategy.userId.toString(),
        walletId: strategy.walletId.toString(),
        crypto: strategy.crypto,
        priceThreshold: strategy.priceThreshold,
        orderAmount: strategy.orderAmount,
        orderPrice: strategy.orderPrice ?? null, // null si non défini (pour les anciennes stratégies)
        tradingWindowStartMinute: strategy.tradingWindowStartMinute,
        tradingWindowStartSecond: strategy.tradingWindowStartSecond,
        buyUpOnly: strategy.buyUpOnly ?? false,
        enabled: strategy.enabled,
        createdAt: strategy.createdAt,
      })),
    })
  } catch (error: any) {
    console.error("Error fetching strategies:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      walletId,
      crypto,
      priceThreshold,
      orderAmount,
      orderPrice,
      tradingWindowStartMinute,
      tradingWindowStartSecond,
      buyUpOnly = false,
      enabled = true,
    } = await request.json()

    if (
      !userId ||
      !walletId ||
      !crypto ||
      priceThreshold === undefined ||
      orderAmount === undefined ||
      tradingWindowStartMinute === undefined ||
      tradingWindowStartSecond === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: userId, walletId, crypto, priceThreshold, orderAmount, tradingWindowStartMinute, tradingWindowStartSecond",
        },
        { status: 400 }
      )
    }

    // Valider orderPrice si fourni
    if (orderPrice !== undefined && (isNaN(orderPrice) || orderPrice < 0 || orderPrice > 100)) {
      return NextResponse.json(
        { error: "orderPrice must be a number between 0 and 100 (centimes)" },
        { status: 400 }
      )
    }

    await connectDB()

    // S'assurer que orderPrice est un nombre valide ou null
    const orderPriceValue = orderPrice !== undefined && !isNaN(orderPrice) ? parseInt(String(orderPrice)) : null

    const strategy = await Strategy.create({
      userId,
      walletId,
      crypto,
      priceThreshold,
      orderAmount,
      orderPrice: orderPriceValue,
      tradingWindowStartMinute,
      tradingWindowStartSecond,
      buyUpOnly,
      enabled,
    })

    // Ajouter la stratégie au moteur de trading si elle est activée
    if (enabled) {
      await tradingEngine.addStrategy(strategy._id.toString())
    }

    return NextResponse.json({
      success: true,
      strategy: {
        _id: strategy._id.toString(),
        userId: strategy.userId.toString(),
        walletId: strategy.walletId.toString(),
        crypto: strategy.crypto,
        priceThreshold: strategy.priceThreshold,
        orderAmount: strategy.orderAmount,
        orderPrice: strategy.orderPrice ?? null,
        tradingWindowStartMinute: strategy.tradingWindowStartMinute,
        tradingWindowStartSecond: strategy.tradingWindowStartSecond,
        buyUpOnly: strategy.buyUpOnly ?? false,
        enabled: strategy.enabled,
        createdAt: strategy.createdAt,
      },
    })
  } catch (error: any) {
    console.error("Error creating strategy:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

