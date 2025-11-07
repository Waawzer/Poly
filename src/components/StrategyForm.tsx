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
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 text-[11px] leading-snug">
      <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Crypto</label>
          <Select
            value={crypto}
            onChange={(e) => setCrypto(e.target.value as Crypto)}
            className="rounded-md border border-border/40 bg-secondary/40 px-2 text-[11px] focus-visible:ring-accent"
            style={{ height: 32 }}
          >
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
            <option value="XRP">XRP</option>
            <option value="SOL">SOL</option>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quantity</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={orderAmount}
            onChange={(e) => setOrderAmount(e.target.value)}
            required
            className="rounded-md border border-border/40 bg-secondary/40 px-2 text-[11px] focus-visible:ring-accent"
            style={{ height: 32 }}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Order Price (¢)</label>
          <Input
            type="number"
            step="1"
            min="0"
            max="100"
            value={orderPrice}
            onChange={(e) => setOrderPrice(e.target.value)}
            required
            className="h-8 rounded-md border border-border/40 bg-secondary/40 px-2 text-[11px] focus-visible:ring-accent"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Threshold (USD)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={priceThreshold}
            onChange={(e) => setPriceThreshold(e.target.value)}
            required
            className="h-8 rounded-md border border-border/40 bg-secondary/40 px-2 text-[11px] focus-visible:ring-accent"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Start Minute</label>
          <Input
            type="number"
            min="0"
            max="14"
            value={tradingWindowStartMinute}
            onChange={(e) => setTradingWindowStartMinute(e.target.value)}
            required
            className="h-8 rounded-md border border-border/40 bg-secondary/40 px-2 text-[11px] focus-visible:ring-accent"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Start Second</label>
          <Input
            type="number"
            min="0"
            max="59"
            value={tradingWindowStartSecond}
            onChange={(e) => setTradingWindowStartSecond(e.target.value)}
            required
            className="h-8 rounded-md border border-border/40 bg-secondary/40 px-2 text-[11px] focus-visible:ring-accent"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/40 px-3 py-2 shadow-sm">
        <div className="flex-1 space-y-0.5 pr-3">
          <label
            htmlFor="buy-up-only"
            className="text-xs font-medium cursor-pointer"
            onClick={() => setBuyUpOnly(!buyUpOnly)}
          >
            Buy UP only
          </label>
          <p className="text-[10px] text-muted-foreground">
            When disabled, the bot can also take DOWN positions.
          </p>
        </div>
        <Switch
          id="buy-up-only"
          checked={buyUpOnly}
          onCheckedChange={setBuyUpOnly}
          className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
        />
      </div>

      <div className="mt-1 flex items-center gap-2">
        <Button
          type="submit"
          disabled={loading}
          className="h-8 flex-1 rounded-lg bg-[linear-gradient(135deg,_rgba(139,91,255,0.85),_rgba(51,197,255,0.75))] px-3 text-xs font-semibold shadow-[0_10px_25px_rgba(51,197,255,0.25)] hover:opacity-95"
        >
          {loading ? "Creating..." : "Add Strategy"}
        </Button>
        {onSuccess && (
          <Button type="button" variant="outline" onClick={onSuccess} className="h-8 rounded-lg border-border/50 px-3 text-xs">
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

