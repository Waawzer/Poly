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
    <div className="border-b bg-muted/30 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
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
              <div key={crypto} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs">{crypto}:</span>
                  {price ? (
                    <>
                      <span className="font-mono font-medium text-xs">
                        ${formatPrice(price.price, decimals)}
                      </span>
                      {priceDiff !== null && (
                        <span
                          className={`text-xs font-medium ${
                            priceDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          ({priceDiff >= 0 ? "+" : ""}${formatPrice(Math.abs(priceDiff), decimals)})
                        </span>
                      )}
                      {priceChange !== null && (
                        <span
                          className={`text-xs font-medium ${
                            priceChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          ({priceChange >= 0 ? "+" : ""}
                          {priceChange.toFixed(2)}%)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground text-xs">...</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="text-xs">O:</span>
                  {openPrice > 0 ? (
                    <span className="font-mono text-xs">${formatPrice(openPrice, decimals)}</span>
                  ) : (
                    <span className="text-xs">-</span>
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

