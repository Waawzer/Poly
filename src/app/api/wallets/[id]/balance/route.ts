import { NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"
import connectDB from "@/lib/mongodb"
import Wallet, { type IWallet } from "@/models/Wallet"

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL

const USDC_ABI = ["function balanceOf(address owner) view returns (uint256)", "function decimals() view returns (uint8)"]

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    await connectDB()

    const wallet = await Wallet.findById(id).lean<(IWallet & { _id: unknown }) | null>()
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    if (!POLYGON_RPC_URL) {
      console.error("POLYGON_RPC_URL not configured")
      return NextResponse.json({
        success: true,
        balance: {
          usdc: 0,
          matic: 0,
          redeemablePositions: 0,
        },
      })
    }

    const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL)

    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
    const [usdcRaw, usdcDecimals] = await Promise.all([
      usdcContract.balanceOf(wallet.address),
      usdcContract.decimals(),
    ])

    const usdc = Number(ethers.formatUnits(usdcRaw, usdcDecimals))
    const maticRaw = await provider.getBalance(wallet.address)
    const matic = Number(ethers.formatEther(maticRaw))

    return NextResponse.json({
      success: true,
      balance: {
        usdc,
        matic,
        redeemablePositions: 0,
      },
    })
  } catch (error: any) {
    console.error("Error fetching wallet balance:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

