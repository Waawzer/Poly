import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Wallet from "@/models/Wallet"
import { polymarketBuilder } from "@/lib/polymarket-builder"

/**
 * Route API pour vérifier et gérer les allowances
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get("tokenId")
    const userId = searchParams.get("userId")

    if (!tokenId || !userId) {
      return NextResponse.json(
        { error: "Token ID and User ID are required" },
        { status: 400 }
      )
    }

    await connectDB()

    // Vérifier que le wallet appartient à l'utilisateur
    const wallet = await Wallet.findById(id)
    if (!wallet || wallet.userId.toString() !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Vérifier l'allowance
    try {
      // Récupérer l'allowance actuelle
      const allowance = await polymarketBuilder.checkAllowance(
        wallet.address,
        tokenId
      )

      return NextResponse.json({
        success: true,
        allowance,
        walletAddress: wallet.address,
        tokenId,
      })
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Error checking allowance",
          hasAllowance: false,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("Error checking allowance:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

