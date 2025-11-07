import { NextRequest, NextResponse } from "next/server"
import { tradingEngine } from "@/lib/trading-engine"

// Route pour initialiser le moteur de trading au démarrage
export async function POST(request: NextRequest) {
  try {
    await tradingEngine.initialize()

    return NextResponse.json({ success: true, message: "Trading engine initialized" })
  } catch (error: any) {
    console.error("Error initializing trading engine:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

