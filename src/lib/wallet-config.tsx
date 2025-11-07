"use client"

import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { polygon, polygonMumbai } from "wagmi/chains"

// Configure chains & providers
// Note: You need to create a WalletConnect project at https://cloud.walletconnect.com
// and add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to your .env.local file
// If not set, WalletConnect will show a warning but the app will still work for direct wallet connections (MetaMask, etc.)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

// WalletConnect Project ID is optional - if not set, only direct wallet connections will work

export const config = getDefaultConfig({
  appName: "Poly Trading Bot",
  projectId: projectId || "00000000000000000000000000000000", // Placeholder - will show warning but allow direct wallet connections
  chains: [polygon, polygonMumbai],
  ssr: true, // If your dApp uses server side rendering (SSR)
})

