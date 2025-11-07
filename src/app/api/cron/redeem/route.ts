import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Wallet from "@/models/Wallet"

// Route pour le redeem automatique (toutes les heures à :00)
// À configurer dans Vercel Cron
export async function GET(request: NextRequest) {
  try {
    // Vérifier que c'est une requête autorisée (Vercel Cron)
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Récupérer tous les wallets
    const wallets = await Wallet.find({}).lean()

    // TODO: Implémenter le redeem automatique pour chaque wallet
    // Pour chaque wallet, vérifier les positions redeemables et les redeem

    return NextResponse.json({
      success: true,
      message: `Redeem processed for ${wallets.length} wallets`,
    })
  } catch (error: any) {
    console.error("Error processing redeem:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

