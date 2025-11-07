import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Wallet from "@/models/Wallet"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    await connectDB()

    const wallets = await Wallet.find({ userId })

    return NextResponse.json({
      success: true,
      wallets: wallets.map((wallet) => ({
        _id: String(wallet._id),
        userId: String(wallet.userId),
        name: wallet.name,
        address: wallet.address,
        safeWalletAddress: wallet.safeWalletAddress,
        allowanceEnabled: wallet.allowanceEnabled,
      })),
    })
  } catch (error: any) {
    console.error("Error fetching wallets:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, name, address, safeWalletAddress } = await request.json()

    if (!userId || !name || !address || !safeWalletAddress) {
      return NextResponse.json(
        { error: "Missing required fields: userId, name, address, safeWalletAddress" },
        { status: 400 }
      )
    }

    await connectDB()

    const wallet = await Wallet.create({
      userId,
      name,
      address,
      safeWalletAddress,
      allowanceEnabled: false,
    })

    return NextResponse.json({
      success: true,
      wallet: {
        _id: String(wallet._id),
        userId: String(wallet.userId),
        name: wallet.name,
        address: wallet.address,
        safeWalletAddress: wallet.safeWalletAddress,
        allowanceEnabled: wallet.allowanceEnabled,
      },
    })
  } catch (error: any) {
    console.error("Error creating wallet:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

