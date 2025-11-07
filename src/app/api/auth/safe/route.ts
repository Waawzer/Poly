import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Wallet from "@/models/Wallet"

export async function POST(request: NextRequest) {
  try {
    const { safeWalletAddress } = await request.json()

    if (!safeWalletAddress) {
      return NextResponse.json({ error: "Safe wallet address is required" }, { status: 400 })
    }

    await connectDB()

    // Find or create user
    let user = await User.findOne({ safeWalletAddress })
    if (!user) {
      user = await User.create({ safeWalletAddress })
    }

    // Check if a wallet already exists for this Safe Wallet address
    let wallet = await Wallet.findOne({ 
      userId: user._id, 
      safeWalletAddress 
    })

    // If no wallet exists, create a default one
    if (!wallet) {
      wallet = await Wallet.create({
        userId: user._id,
        name: `Wallet ${safeWalletAddress.slice(0, 6)}...${safeWalletAddress.slice(-4)}`,
        address: safeWalletAddress, // For Safe Wallet, address and safeWalletAddress are the same
        safeWalletAddress,
        allowanceEnabled: false,
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id.toString(),
        safeWalletAddress: user.safeWalletAddress,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
      },
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
    console.error("Error in auth/safe:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

