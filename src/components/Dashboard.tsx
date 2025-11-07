"use client"

import { useEffect, useState } from "react"
import { useStore } from "@/store/useStore"
import { StrategiesTable } from "@/components/StrategiesTable"
import { StrategyForm } from "@/components/StrategyForm"
import { StatsBar } from "@/components/StatsBar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function Dashboard() {
  const user = useStore((state) => state.user)
  const wallet = useStore((state) => state.wallet)
  const setWallet = useStore((state) => state.setWallet)

  // Load wallet when user is available
  useEffect(() => {
    if (user && !wallet) {
      // Get the wallet for this user
      fetch(`/api/wallets?userId=${user._id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.wallets.length > 0) {
            // Use the first wallet (there should only be one)
            setWallet(data.wallets[0])
          }
        })
        .catch((error) => {
          console.error("Error loading wallet:", error)
        })
    }
  }, [user, wallet, setWallet])

  if (!user) {
    return null
  }

  return (
    <section className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
        <p className="text-muted-foreground">Monitor your strategies and trading performance</p>
      </div>

      {/* Stats Bar */}
      <StatsBar />

      {/* Main Content: Strategy Creator (Left) and Strategies List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_2fr] gap-6">
        {/* Strategy Creator - Left Side */}
        <div className="lg:col-start-1">
          <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-[var(--shadow-glow)]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-wide text-foreground">Create Strategy</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Configure and deploy a new automated play in under a minute.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StrategyForm />
            </CardContent>
          </Card>
        </div>

        {/* Strategies List - Right Side */}
        <div className="lg:col-start-2">
          <StrategiesTable />
        </div>
      </div>
    </section>
  )
}

