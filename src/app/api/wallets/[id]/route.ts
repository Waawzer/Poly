import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Wallet from "@/models/Wallet"
import Strategy from "@/models/Strategy"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    await connectDB()

    // Check if wallet exists
    const wallet = await Wallet.findById(id)
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    // Delete all strategies associated with this wallet
    await Strategy.deleteMany({ walletId: id })

    // Delete the wallet
    await Wallet.findByIdAndDelete(id)

    return NextResponse.json({
      success: true,
      message: "Wallet and associated strategies deleted successfully",
    })
  } catch (error: any) {
    console.error("Error deleting wallet:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const updates = await request.json()

    await connectDB()

    const wallet = await Wallet.findByIdAndUpdate(id, updates, { new: true }).lean()
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      wallet: {
        _id: wallet._id.toString(),
        userId: wallet.userId.toString(),
        name: wallet.name,
        address: wallet.address,
        safeWalletAddress: wallet.safeWalletAddress,
        allowanceEnabled: wallet.allowanceEnabled,
      },
    })
  } catch (error: any) {
    console.error("Error updating wallet:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

