"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import type { Wallet } from "@/types"

interface WalletBalanceProps {
  wallet: Wallet
}

export function WalletBalance({ wallet }: WalletBalanceProps) {
  const [balance, setBalance] = useState<{
    usdc: number
    matic: number
    redeemablePositions: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch(`/api/wallets/${wallet._id}/balance`)
        const data = await response.json()
        if (data.success) {
          setBalance(data.balance)
        }
      } catch (error) {
        console.error("Error fetching balance:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [wallet._id])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wallet Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (!balance) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">USDC</span>
            <span className="text-lg font-semibold">{formatCurrency(balance.usdc, "USD")}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">POL</span>
            <span className="text-lg font-semibold">{balance.matic.toFixed(4)} MATIC</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Redeemable Positions</span>
            <span className="text-lg font-semibold">{balance.redeemablePositions}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

