import type { Strategy, PriceData } from "@/types"
import { getExactCandleTimestamp, getCandleMinute } from "./utils"

/**
 * Vérifie si les conditions d'une stratégie sont remplies
 */
export function areStrategyConditionsMet(
  strategy: Strategy,
  priceData: PriceData | null,
  candleOpenPrice: number | null
): boolean {
  if (!strategy.enabled || !priceData || candleOpenPrice === null) {
    return false
  }

  // Vérifier si on est dans la bonne crypto
  if (priceData.crypto !== strategy.crypto) {
    return false
  }

  // Calculer le timestamp de la bougie actuelle
  const candleTimestamp = getExactCandleTimestamp(priceData.timestamp)
  const candleStartTime = candleTimestamp
  const strategyStartTime = candleStartTime + 
    (strategy.tradingWindowStartMinute * 60 * 1000) + 
    (strategy.tradingWindowStartSecond * 1000)

  // Vérifier si on est après le début de la fenêtre de trading
  if (priceData.timestamp < strategyStartTime) {
    return false
  }

  // Vérifier si le threshold est dépassé
  const priceDifference = priceData.price - candleOpenPrice
  const absPriceDifference = Math.abs(priceDifference)

  if (absPriceDifference < strategy.priceThreshold) {
    return false
  }

  // Vérifier la direction si buyUpOnly
  // Si buyUpOnly est true, on ne trade que si le prix a augmenté (priceDifference >= threshold)
  if (strategy.buyUpOnly && priceDifference < strategy.priceThreshold) {
    return false
  }

  return true
}

/**
 * Calcule l'écart actuel entre le prix actuel et le prix d'ouverture
 */
export function getCurrentPriceDifference(
  priceData: PriceData | null,
  candleOpenPrice: number | null
): number | null {
  if (!priceData || candleOpenPrice === null) {
    return null
  }

  return priceData.price - candleOpenPrice
}

