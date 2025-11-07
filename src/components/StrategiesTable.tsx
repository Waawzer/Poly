"use client"

import { useEffect, useState } from "react"
import { useStore } from "@/store/useStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { formatPrice, formatCurrency } from "@/lib/utils"
import { areStrategyConditionsMet, getCurrentPriceDifference } from "@/lib/strategy-utils"
import { CandleTimer } from "@/components/CandleTimer"
import type { Strategy } from "@/types"

interface StrategyStats {
  totalOrders: number
  totalPnL: number
}

export function StrategiesTable() {
  const strategies = useStore((state) => state.strategies)
  const setStrategies = useStore((state) => state.setStrategies)
  const updateStrategy = useStore((state) => state.updateStrategy)
  const removeStrategy = useStore((state) => state.removeStrategy)
  const user = useStore((state) => state.user)
  const prices = useStore((state) => state.prices)
  
  const [strategyStats, setStrategyStats] = useState<Record<string, StrategyStats>>({})
  const [candleOpenPrices, setCandleOpenPrices] = useState<Record<string, number>>({})
  const [conditionsMet, setConditionsMet] = useState<Record<string, boolean>>({})

  // Fetch strategies
  useEffect(() => {
    if (!user) return

    const fetchStrategies = () => {
      fetch(`/api/strategies?userId=${user._id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStrategies(data.strategies)
          }
        })
        .catch((error) => {
          console.error("Error fetching strategies:", error)
        })
    }

    fetchStrategies()
    // Refresh every 10 seconds
    const interval = setInterval(fetchStrategies, 10000)
    return () => clearInterval(interval)
  }, [user, setStrategies])

  // Fetch stats for each strategy
  useEffect(() => {
    if (!user || strategies.length === 0) return

    const fetchStats = async () => {
      const statsPromises = strategies.map(async (strategy) => {
        try {
          const response = await fetch(`/api/strategies/${strategy._id}/stats?userId=${user._id}`)
          const data = await response.json()
          if (data.success) {
            return {
              strategyId: strategy._id,
              stats: data.stats,
            }
          }
        } catch (error) {
          console.error(`Error fetching stats for strategy ${strategy._id}:`, error)
        }
        return null
      })

      const results = await Promise.all(statsPromises)
      const newStats: Record<string, StrategyStats> = {}
      results.forEach((result) => {
        if (result) {
          newStats[result.strategyId] = result.stats
        }
      })
      setStrategyStats(newStats)
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [user, strategies])

  // Fetch candle open prices
  useEffect(() => {
    if (strategies.length === 0) return

    const fetchCandleOpenPrices = async () => {
      const cryptos = Array.from(new Set(strategies.map((s) => s.crypto)))
      const pricePromises = cryptos.map(async (crypto) => {
        try {
          const response = await fetch(`/api/prices/candle-open?crypto=${crypto}`)
          const data = await response.json()
          if (data.success && data.openPrice !== null) {
            return { crypto, openPrice: data.openPrice }
          }
        } catch (error) {
          console.error(`Error fetching candle open price for ${crypto}:`, error)
        }
        return null
      })

      const results = await Promise.all(pricePromises)
      const newPrices: Record<string, number> = {}
      results.forEach((result) => {
        if (result) {
          newPrices[result.crypto] = result.openPrice
        }
      })
      setCandleOpenPrices(newPrices)
    }

    fetchCandleOpenPrices()
    const interval = setInterval(fetchCandleOpenPrices, 2000) // Refresh every 2 seconds
    return () => clearInterval(interval)
  }, [strategies])

  // Check if conditions are met for each strategy
  useEffect(() => {
    if (strategies.length === 0) return

    const newConditionsMet: Record<string, boolean> = {}
    strategies.forEach((strategy) => {
      const priceData = prices[strategy.crypto]
      const candleOpenPrice = candleOpenPrices[strategy.crypto] ?? null
      newConditionsMet[strategy._id] = areStrategyConditionsMet(
        strategy,
        priceData || null,
        candleOpenPrice
      )
    })
    setConditionsMet(newConditionsMet)
  }, [strategies, prices, candleOpenPrices])

  const handleToggle = async (strategyId: string, enabled: boolean) => {
    if (!user) return
    
    try {
      const response = await fetch(`/api/strategies/${strategyId}?userId=${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      })

      const data = await response.json()
      if (data.success) {
        updateStrategy(strategyId, { enabled: !enabled })
      }
    } catch (error) {
      console.error("Error toggling strategy:", error)
    }
  }

  const handleDelete = async (strategyId: string) => {
    if (!user) return
    if (!confirm("Are you sure you want to delete this strategy?")) return

    try {
      const response = await fetch(`/api/strategies/${strategyId}?userId=${user._id}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (data.success) {
        removeStrategy(strategyId)
      }
    } catch (error) {
      console.error("Error deleting strategy:", error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>My Strategies</CardTitle>
          <CandleTimer />
        </div>
      </CardHeader>
      <CardContent>
        {strategies.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-muted-foreground mb-2">No strategies yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first strategy using the form on the right
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crypto</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Order Price</TableHead>
                  <TableHead>Threshold / Écart</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>PnL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strategies.map((strategy) => {
                  const stats = strategyStats[strategy._id] || { totalOrders: 0, totalPnL: 0 }
                  const priceData = prices[strategy.crypto]
                  const candleOpenPrice = candleOpenPrices[strategy.crypto] ?? null
                  const currentDifference = getCurrentPriceDifference(priceData || null, candleOpenPrice)
                  const isConditionsMet = conditionsMet[strategy._id] || false
                  
                  return (
                    <TableRow 
                      key={strategy._id}
                      className={isConditionsMet ? "bg-green-50 dark:bg-green-950/20" : ""}
                    >
                      <TableCell className="font-medium">{strategy.crypto}</TableCell>
                      <TableCell>{formatPrice(strategy.orderAmount)}</TableCell>
                      <TableCell>
                        {strategy.orderPrice !== undefined && 
                         strategy.orderPrice !== null && 
                         !isNaN(strategy.orderPrice) && 
                         strategy.orderPrice > 0 ? (
                          <>
                            <span className="font-medium">${(strategy.orderPrice / 100).toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({strategy.orderPrice}¢)
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{formatPrice(strategy.priceThreshold)}</div>
                          {currentDifference !== null && (
                            <div className={`text-xs ${
                              Math.abs(currentDifference) >= strategy.priceThreshold
                                ? "text-green-600 dark:text-green-400 font-semibold"
                                : "text-muted-foreground"
                            }`}>
                              {currentDifference >= 0 ? "+" : ""}{formatPrice(currentDifference, 2)} USD
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {String(strategy.tradingWindowStartMinute).padStart(2, "0")}:
                        {String(strategy.tradingWindowStartSecond).padStart(2, "0")}
                      </TableCell>
                      <TableCell>
                        {strategy.buyUpOnly ? (
                          <span className="text-xs text-blue-600 dark:text-blue-400">UP only</span>
                        ) : (
                          <span className="text-xs text-purple-600 dark:text-purple-400">UP & DOWN</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{stats.totalOrders}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          stats.totalPnL >= 0 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-red-600 dark:text-red-400"
                        }`}>
                          {stats.totalPnL >= 0 ? "+" : ""}{formatCurrency(stats.totalPnL, "USD")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            strategy.enabled
                              ? isConditionsMet
                                ? "bg-green-500 text-white dark:bg-green-600"
                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {strategy.enabled ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggle(strategy._id, strategy.enabled)}
                          >
                            {strategy.enabled ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(strategy._id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

