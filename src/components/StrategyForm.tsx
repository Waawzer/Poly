"use client"

import { useState } from "react"
import { useStore } from "@/store/useStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
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
  const [tradingWindowEndMinute, setTradingWindowEndMinute] = useState("15")
  const [buyUpOnly, setBuyUpOnly] = useState(false)
  const [loading, setLoading] = useState(false)

  const baseFieldClass =
    "h-9 w-full rounded-md border border-border/40 bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-accent/70 focus-visible:ring-1 focus-visible:ring-accent/50 transition"
  const labelClass = "text-[11px] font-medium text-muted-foreground"

  const Field = ({
    label,
    hint,
    children,
  }: {
    label: string
    hint?: string
    children: React.ReactNode
  }) => (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between">
        <span className={labelClass}>{label}</span>
        {hint && <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/65">{hint}</span>}
      </span>
      {children}
    </label>
  )

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
          tradingWindowEndMinute: Math.min(
            15,
            Math.max(parseInt(tradingWindowStartMinute), parseInt(tradingWindowEndMinute))
          ),
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
        setTradingWindowEndMinute("15")
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="border-border/30 bg-card/90 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Strategy quick setup</CardTitle>
          <CardDescription>Fill the core parameters and deploy instantly.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <Field label="Crypto" hint="Symbol">
              <Select
                value={crypto}
                onChange={(e) => setCrypto(e.target.value as Crypto)}
                className={`${baseFieldClass} appearance-none`}
              >
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
                <option value="XRP">XRP</option>
                <option value="SOL">SOL</option>
              </Select>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Quantity" hint="Shares">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  required
                  className={baseFieldClass}
                  placeholder="10"
                />
              </Field>

              <Field label="Order price" hint="Centimes">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(e.target.value)}
                  required
                  className={baseFieldClass}
                  placeholder="50"
                />
              </Field>
            </div>

            <Field label="Price threshold" hint="USD">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceThreshold}
                onChange={(e) => setPriceThreshold(e.target.value)}
                required
                className={baseFieldClass}
                placeholder="100.00"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Window minute" hint="0-14">
                <Input
                  type="number"
                  min="0"
                  max="14"
                  value={tradingWindowStartMinute}
                  onChange={(e) => setTradingWindowStartMinute(e.target.value)}
                  required
                  className={baseFieldClass}
                  placeholder="13"
                />
              </Field>

              <Field label="End minute" hint="0-15">
                <Input
                  type="number"
                  min="0"
                  max="15"
                  value={tradingWindowEndMinute}
                  onChange={(e) => setTradingWindowEndMinute(e.target.value)}
                  required
                  className={baseFieldClass}
                  placeholder="15"
                />
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/40 bg-muted/30 px-3 py-2">
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Buy UP only</p>
                <p className="text-[11px]">Disable to allow DOWN orders when price drops.</p>
              </div>
              <Switch
                id="buy-up-only"
                checked={buyUpOnly}
                onCheckedChange={setBuyUpOnly}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/40"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {onSuccess && (
            <Button
              type="button"
              variant="outline"
              onClick={onSuccess}
              className="h-9 rounded-md border-border/40 px-4 text-xs"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="h-9 rounded-md bg-[linear-gradient(135deg,_rgba(109,125,255,0.95),_rgba(51,197,255,0.85))] px-5 text-xs font-semibold text-white shadow-md"
          >
            {loading ? "Creating…" : "Launch Strategy"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

