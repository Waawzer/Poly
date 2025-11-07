import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Wallet from "@/models/Wallet"

/**
 * Route API pour obtenir les adresses des contrats Polymarket à approuver
 * et vérifier les allowances actuelles pour un wallet
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("walletAddress")
    const userId = searchParams.get("userId")

    if (!walletAddress || !userId) {
      return NextResponse.json(
        { error: "Wallet address and User ID are required" },
        { status: 400 }
      )
    }

    await connectDB()

    // Vérifier que le wallet appartient à l'utilisateur
    const wallet = await Wallet.findOne({
      userId,
      address: walletAddress.toLowerCase(),
    }).lean()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    // Adresses des contrats Polymarket à approuver
    const addressesToApprove = {
      "Polymarket Exchange": process.env.NEXT_PUBLIC_POLYMARKET_EXCHANGE_ADDRESS || "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
      "CTF Exchange": process.env.NEXT_PUBLIC_CTF_EXCHANGE_ADDRESS || "0xC5d563A36AE78145C45a50134d48A1215220f80a",
      "ConditionalTokens": process.env.NEXT_PUBLIC_CONDITIONAL_TOKENS_ADDRESS || "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045",
      "Neg Risk CTF Exchange": process.env.NEXT_PUBLIC_NEG_RISK_CTF_EXCHANGE_ADDRESS || "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",
    }

    // USDC address
    const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

    return NextResponse.json({
      success: true,
      walletAddress: wallet.address,
      usdcAddress,
      addressesToApprove,
      // Note: Les allowances seront vérifiées côté client car nécessitent un provider
    })
  } catch (error: any) {
    console.error("Error fetching approval info:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

