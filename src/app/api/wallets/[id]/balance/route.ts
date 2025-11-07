import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Wallet from "@/models/Wallet"
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    await connectDB()

    const wallet = await Wallet.findById(id).lean()
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    // TODO: Implémenter la récupération des soldes via RPC Polygon
    // Les fonctions getUSDCBalance et getMATICBalance nécessitent un provider client-side
    // Pour l'instant, on retourne des valeurs par défaut
    const usdcBalance = 0
    const maticBalance = 0

    // TODO: Récupérer les positions redeemables depuis Polymarket

    return NextResponse.json({
      success: true,
      balance: {
        usdc: usdcBalance,
        matic: maticBalance,
        redeemablePositions: 0, // À implémenter
      },
    })
  } catch (error: any) {
    console.error("Error fetching wallet balance:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

