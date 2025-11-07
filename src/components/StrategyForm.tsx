"use client"

import { useState } from "react"
import { useStore } from "@/store/useStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { Crypto } from "@/types"

interface StrategyFormProps {
  onSuccess?: () => void
}

export function StrategyForm({ onSuccess }: StrategyFormProps) {
  const user = useStore((state) => state.user)
  const wallet = useStore((state) => state.wallet)
  const addStrategy = useStore((state) => state.addStrategy)
  const setStrategies = useStore((state) => state.setStrategies)

  const [crypto, setCrypto] = useState<Crypto>("BTC")
  const [orderAmount, setOrderAmount] = useState("")
  const [orderPrice, setOrderPrice] = useState("50") // Default: 50 centimes = 0.5$
  const [priceThreshold, setPriceThreshold] = useState("")
  const [tradingWindowStartMinute, setTradingWindowStartMinute] = useState("13")
  const [tradingWindowStartSecond, setTradingWindowStartSecond] = useState("0")
  const [buyUpOnly, setBuyUpOnly] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !wallet) {
      alert("Please connect your wallet first")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          walletId: wallet._id,
          crypto,
          orderAmount: parseFloat(orderAmount),
          orderPrice: parseInt(orderPrice),
          priceThreshold: parseFloat(priceThreshold),
          tradingWindowStartMinute: parseInt(tradingWindowStartMinute),
          tradingWindowStartSecond: parseInt(tradingWindowStartSecond),
          buyUpOnly,
          enabled: true,
        }),
      })

      const data = await response.json()

      if (data.success) {
        addStrategy(data.strategy)
        // Reset form
        setCrypto("BTC")
        setOrderAmount("")
        setOrderPrice("50")
        setPriceThreshold("")
        setTradingWindowStartMinute("13")
        setTradingWindowStartSecond("0")
        setBuyUpOnly(false)
        
        // Refresh strategies list
        if (user) {
          const strategiesResponse = await fetch(`/api/strategies?userId=${user._id}`)
          const strategiesData = await strategiesResponse.json()
          if (strategiesData.success) {
            setStrategies(strategiesData.strategies)
          }
        }
        
        if (onSuccess) {
          onSuccess()
        }
      } else {
        alert(data.error || "Error creating strategy")
      }
    } catch (error) {
      console.error("Error creating strategy:", error)
      alert("Error creating strategy")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Crypto</label>
        <Select value={crypto} onChange={(e) => setCrypto(e.target.value as Crypto)}>
          <option value="BTC">BTC</option>
          <option value="ETH">ETH</option>
          <option value="XRP">XRP</option>
          <option value="SOL">SOL</option>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Quantity (shares)</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={orderAmount}
          onChange={(e) => setOrderAmount(e.target.value)}
          placeholder="10"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Number of shares to trade
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Order Price (centimes)</label>
        <Input
          type="number"
          step="1"
          min="0"
          max="100"
          value={orderPrice}
          onChange={(e) => setOrderPrice(e.target.value)}
          placeholder="50"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Order price in cents (e.g., 50 for $0.50, 100 for $1.00)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Threshold (USD)</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={priceThreshold}
          onChange={(e) => setPriceThreshold(e.target.value)}
          placeholder="100.00"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Absolute difference between current price and opening price (in USD)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Minute</label>
          <Input
            type="number"
            min="0"
            max="14"
            value={tradingWindowStartMinute}
            onChange={(e) => setTradingWindowStartMinute(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start Second</label>
          <Input
            type="number"
            min="0"
            max="59"
            value={tradingWindowStartSecond}
            onChange={(e) => setTradingWindowStartSecond(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
        <div className="space-y-0.5 flex-1">
          <label 
            htmlFor="buy-up-only" 
            className="text-sm font-medium cursor-pointer"
            onClick={() => setBuyUpOnly(!buyUpOnly)}
          >
            Buy UP only
          </label>
          <p className="text-xs text-muted-foreground">
            If enabled, the strategy will only attempt &quot;buy UP&quot; orders. Otherwise, it will try both UP and DOWN.
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <Switch
            id="buy-up-only"
            checked={buyUpOnly}
            onCheckedChange={setBuyUpOnly}
            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Creating..." : "Add Strategy"}
        </Button>
        {onSuccess && (
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

