import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Wallet from "@/models/Wallet"

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
    }

    await connectDB()

    // Find or create user by wallet address
    // For regular wallets, we use walletAddress instead of safeWalletAddress
    let user = await User.findOne({ 
      $or: [
        { walletAddress: walletAddress.toLowerCase() },
        { safeWalletAddress: walletAddress.toLowerCase() }
      ]
    })
    if (!user) {
      user = await User.create({ walletAddress: walletAddress.toLowerCase() })
    } else if (!user.walletAddress) {
      // Update existing user to include walletAddress
      user.walletAddress = walletAddress.toLowerCase()
      await user.save()
    }

    // Check if a wallet already exists for this address
    let wallet = await Wallet.findOne({
      userId: user._id,
      address: walletAddress,
    })

    // If no wallet exists, create a default one
    if (!wallet) {
      wallet = await Wallet.create({
        userId: user._id,
        name: `Wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        address: walletAddress,
        safeWalletAddress: walletAddress, // For regular wallets, use the same address
        allowanceEnabled: false,
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id.toString(),
        walletAddress: user.walletAddress || user.safeWalletAddress,
        safeWalletAddress: user.safeWalletAddress,
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
    console.error("Error in auth/wallet:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

