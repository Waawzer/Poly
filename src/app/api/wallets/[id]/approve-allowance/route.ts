import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Wallet from "@/models/Wallet"
import { polymarketBuilder } from "@/lib/polymarket-builder"

/**
 * Route API pour approuver une allowance
 * Nécessite que l'utilisateur signe une transaction avec son wallet
 * Pour l'instant, cette route retourne les informations nécessaires
 * L'approbation réelle doit être faite côté client avec le wallet de l'utilisateur
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { tokenId, amount, userId } = await request.json()

    if (!tokenId || !amount || !userId) {
      return NextResponse.json(
        { error: "Token ID, amount, and User ID are required" },
        { status: 400 }
      )
    }

    await connectDB()

    // Vérifier que le wallet appartient à l'utilisateur
    const wallet = await Wallet.findById(id).lean()
    if (!wallet || wallet.userId.toString() !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Note: L'approbation réelle nécessite une signature de transaction
    // Avec le builder code, on peut utiliser le ClobClient pour approuver
    // Mais cela nécessite que l'utilisateur signe la transaction avec son wallet
    
    // Pour l'instant, on retourne les informations nécessaires
    // L'approbation doit être faite côté client avec le wallet de l'utilisateur
    return NextResponse.json({
      success: true,
      message: "Allowance approval requires wallet signature",
      walletAddress: wallet.address,
      tokenId,
      amount,
      // L'utilisateur devra appeler approve() sur le contrat depuis son wallet
    })
  } catch (error: any) {
    console.error("Error processing allowance approval:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

