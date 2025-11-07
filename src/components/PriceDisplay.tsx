"use client"

import { useEffect } from "react"
import { useStore } from "@/store/useStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrice } from "@/lib/utils"
import type { Crypto } from "@/types"

interface PriceDisplayProps {
  crypto: Crypto
}

export function PriceDisplay({ crypto }: PriceDisplayProps) {
  const prices = useStore((state) => state.prices)
  const updatePrice = useStore((state) => state.updatePrice)

  useEffect(() => {
    // Récupérer le prix initial
    fetch(`/api/prices?crypto=${crypto}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.prices[crypto]) {
          updatePrice(crypto, data.prices[crypto])
        }
      })

    // S'abonner aux mises à jour WebSocket (à implémenter)
    // Pour l'instant, on fait un polling toutes les 5 secondes
    const interval = setInterval(() => {
      fetch(`/api/prices?crypto=${crypto}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.prices[crypto]) {
            updatePrice(crypto, data.prices[crypto])
          }
        })
    }, 5000)

    return () => clearInterval(interval)
  }, [crypto, updatePrice])

  const price = prices[crypto]

  if (!price) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{crypto}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  const priceChange =
    price.openPrice !== undefined
      ? ((price.price - price.openPrice) / price.openPrice) * 100
      : null

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{crypto}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1">{formatPrice(price.price, 2)} USD</div>
        {priceChange !== null && (
          <div
            className={`text-sm font-medium ${
              priceChange >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {priceChange >= 0 ? "+" : ""}
            {priceChange.toFixed(2)}%
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-2">
          {new Date(price.timestamp).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
}

