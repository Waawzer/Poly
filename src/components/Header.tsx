"use client"

import { useEffect, useState } from "react"
import { useStore } from "@/store/useStore"
import { WalletConnectButton } from "@/components/WalletConnectButton"
import { ApproveAllContractsButton } from "@/components/ApproveAllContractsButton"

export function Header() {
  const user = useStore((state) => state.user)
  const wallet = useStore((state) => state.wallet)
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  useEffect(() => {
    if (!wallet?._id) {
      setUsdcBalance(null)
      return
    }

    let isCancelled = false

    const fetchBalance = async () => {
      setLoadingBalance(true)
      try {
        const response = await fetch(`/api/wallets/${wallet._id}/balance`)
        const data = await response.json()
        if (!isCancelled && data.success) {
          const raw = data.balance?.usdc
          const parsed = typeof raw === "number" ? raw : raw ? parseFloat(raw) : null
          setUsdcBalance(Number.isFinite(parsed ?? NaN) ? (parsed as number) : 0)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Error fetching wallet balance:", error)
          setUsdcBalance(0)
        }
      } finally {
        if (!isCancelled) {
          setLoadingBalance(false)
        }
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 30000)

    return () => {
      isCancelled = true
      clearInterval(interval)
    }
  }, [wallet?._id])

  return (
    <header className="border-b border-border/40 bg-[radial-gradient(circle_at_top,_rgba(51,197,255,0.15),_transparent_55%)] bg-secondary/50 backdrop-blur-2xl supports-[backdrop-filter]:bg-secondary/60 shadow-[var(--shadow-glow)]">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,_rgba(139,91,255,0.8),_rgba(51,197,255,0.6))] text-background shadow-lg shadow-[rgba(51,197,255,0.35)]">
            <span className="text-base font-bold">PB</span>
          </div>
          <h1 className="text-xl font-semibold tracking-wide">Poly Trading Bot</h1>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {user && <ApproveAllContractsButton />}
          <WalletConnectButton />
        </div>
      </div>
    </header>
  )
}

