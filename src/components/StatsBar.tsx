"use client"

import { useEffect, useState } from "react"
import { useStore } from "@/store/useStore"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

interface Stats {
  totalPnL: number
  totalVolume: number
  totalOrders: number
  redeemablePositions: number
}

export function StatsBar() {
  const user = useStore((state) => state.user)
  const wallet = useStore((state) => state.wallet)
  const [stats, setStats] = useState<Stats>({
    totalPnL: 0,
    totalVolume: 0,
    totalOrders: 0,
    redeemablePositions: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchStats = async () => {
      try {
        // Fetch stats from API
        const statsResponse = await fetch(`/api/stats?userId=${user._id}`)
        const statsData = await statsResponse.json()

        // Fetch wallet balance for redeemable positions
        let redeemablePositions = 0
        if (wallet) {
          try {
            const balanceResponse = await fetch(`/api/wallets/${wallet._id}/balance`)
            const balanceData = await balanceResponse.json()
            if (balanceData.success) {
              redeemablePositions = balanceData.balance?.redeemablePositions || 0
            }
          } catch (error) {
            console.error("Error fetching balance:", error)
          }
        }

        if (statsData.success) {
          setStats({
            totalPnL: statsData.stats.totalPnL || 0,
            totalVolume: statsData.stats.totalVolume || 0,
            totalOrders: statsData.stats.totalOrders || 0,
            redeemablePositions,
          })
        }
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [user, wallet])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total PnL</p>
            <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {stats.totalPnL >= 0 ? "+" : ""}{formatCurrency(stats.totalPnL, "USD")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Volume Effectué</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalVolume, "USD")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Nombre d'Ordres</p>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Positions Redeemable</p>
            <p className="text-2xl font-bold">{stats.redeemablePositions}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

