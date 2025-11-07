import { NextRequest, NextResponse } from "next/server"
import { tradingEngine } from "@/lib/trading-engine"

// Route pour initialiser le moteur de trading
// À appeler au démarrage de l'application ou via Vercel Cron
export async function GET(request: NextRequest) {
  try {
    // Vérifier que c'est une requête autorisée (Vercel Cron ou interne)
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await tradingEngine.initialize()

    return NextResponse.json({ success: true, message: "Trading engine initialized" })
  } catch (error: any) {
    console.error("Error initializing trading engine:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

