"use client"

import { useEffect, useState } from "react"
import { formatPrice, getExactCandleTimestamp } from "@/lib/utils"
import type { Crypto, PriceData } from "@/types"
import { useStore } from "@/store/useStore"

export function LivePricesBar() {
  const prices = useStore((state) => state.prices)
  const updatePrice = useStore((state) => state.updatePrice)
  const [candleOpenPrices, setCandleOpenPrices] = useState<Record<Crypto, number>>({
    BTC: 0,
    ETH: 0,
    XRP: 0,
    SOL: 0,
  })

  useEffect(() => {
    // Récupérer les prix initiaux
    const fetchPrices = async () => {
      try {
        const response = await fetch("/api/prices")
        const data = await response.json()
        if (data.success && data.prices) {
          Object.entries(data.prices).forEach(([crypto, priceData]: [string, any]) => {
            updatePrice(crypto as Crypto, priceData)
          })
        }
      } catch (error) {
        console.error("Error fetching prices:", error)
      }
    }

    fetchPrices()

    // Polling toutes les 1 seconde pour des mises à jour en temps réel
    const interval = setInterval(fetchPrices, 1000)

    return () => clearInterval(interval)
  }, [updatePrice])

  useEffect(() => {
    // Récupérer les prix d'ouverture de la bougie actuelle
    const fetchCandleOpenPrices = async () => {
      const currentCandle = getExactCandleTimestamp(Date.now())
      const cryptos: Crypto[] = ["BTC", "ETH", "XRP", "SOL"]

      for (const crypto of cryptos) {
        try {
          const response = await fetch(`/api/prices/candle-open?crypto=${crypto}&timestamp=${currentCandle}`)
          const data = await response.json()
          if (data.success && data.openPrice) {
            setCandleOpenPrices((prev) => ({
              ...prev,
              [crypto]: data.openPrice,
            }))
          }
        } catch (error) {
          console.error(`Error fetching candle open price for ${crypto}:`, error)
        }
      }
    }

    fetchCandleOpenPrices()

    // Polling toutes les 2 secondes pour récupérer les prix d'ouverture
    // (surtout important au début d'une nouvelle bougie)
    const interval = setInterval(fetchCandleOpenPrices, 2000)

    return () => clearInterval(interval)
  }, [])

  const cryptos: Crypto[] = ["BTC", "ETH", "XRP", "SOL"]

  // Déterminer le nombre de décimales selon la crypto
  const getDecimals = (crypto: Crypto): number => {
    return crypto === "XRP" ? 4 : 2
  }

  return (
    <div className="sticky top-0 z-20 border-b border-border/40 bg-[linear-gradient(90deg,_rgba(12,10,32,0.85),_rgba(17,12,40,0.9))] backdrop-blur-xl">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] sm:text-xs text-muted-foreground">
          {cryptos.map((crypto) => {
            const price = prices[crypto]
            const openPrice = candleOpenPrices[crypto]
            const decimals = getDecimals(crypto)
            const priceChange = price && openPrice && openPrice > 0
              ? ((price.price - openPrice) / openPrice) * 100
              : null
            const priceDiff = price && openPrice && openPrice > 0
              ? price.price - openPrice
              : null

            return (
              <div key={crypto} className="flex items-center gap-2 rounded-full bg-secondary/50 px-3 py-1 backdrop-blur">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold uppercase tracking-wide text-accent-foreground">{crypto}</span>
                  {price ? (
                    <>
                      <span className="font-mono font-medium text-foreground/90">
                        ${formatPrice(price.price, decimals)}
                      </span>
                      {priceDiff !== null && (
                        <span
                          className={`font-semibold ${
                            priceDiff >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {priceDiff >= 0 ? "+" : "-"}${formatPrice(Math.abs(priceDiff), decimals)}
                        </span>
                      )}
                      {priceChange !== null && (
                        <span
                          className={`font-medium ${
                            priceChange >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {priceChange >= 0 ? "+" : ""}
                          {priceChange.toFixed(2)}%
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground text-xs">...</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="font-semibold text-muted-foreground/80">O:</span>
                  {openPrice > 0 ? (
                    <span className="font-mono text-foreground/80">${formatPrice(openPrice, decimals)}</span>
                  ) : (
                    <span>-</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

