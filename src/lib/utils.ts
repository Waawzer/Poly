import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, decimals: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price)
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount)
}

export function getCandleTimestamp(timestamp: number): number {
  // Bougie 15 minutes : (timestamp // 900000) * 900000 (en millisecondes)
  // ou (timestamp // 900) * 900 (en secondes)
  if (timestamp > 1e12) {
    // Timestamp en millisecondes
    return Math.floor(timestamp / 900000) * 900000
  } else {
    // Timestamp en secondes
    return Math.floor(timestamp / 900) * 900
  }
}

export function getCurrentCandleTimestamp(): number {
  return getCandleTimestamp(Date.now())
}

export function getCandleMinute(timestamp: number): number {
  const date = new Date(timestamp)
  return date.getMinutes() % 15
}

export function isInTradingWindow(
  windowStart: number,
  windowEnd: number,
  currentTimestamp?: number
): boolean {
  const now = currentTimestamp || Date.now()
  const minute = getCandleMinute(now)
  return minute >= windowStart && minute <= windowEnd
}

/**
 * Calcule le timestamp exact d'une bougie 15 minutes
 * Les bougies commencent à :00, :15, :30, :45 de chaque heure
 */
export function getExactCandleTimestamp(timestamp: number): number {
  const date = new Date(timestamp)
  const minutes = date.getMinutes()
  
  // Arrondir à la bougie précédente (00, 15, 30, 45)
  const candleMinute = Math.floor(minutes / 15) * 15
  
  // Créer un nouveau timestamp avec les minutes/secondes/millisecondes à zéro
  const candleDate = new Date(date)
  candleDate.setMinutes(candleMinute, 0, 0)
  
  return candleDate.getTime()
}

/**
 * Vérifie si un timestamp correspond exactement au début d'une bougie 15 minutes
 */
export function isCandleStart(timestamp: number): boolean {
  const date = new Date(timestamp)
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  const milliseconds = date.getMilliseconds()
  
  // Vérifier si on est exactement à :00, :15, :30, ou :45 avec secondes et ms à 0
  return (minutes % 15 === 0) && seconds === 0 && milliseconds === 0
}

