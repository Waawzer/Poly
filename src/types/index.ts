export type Crypto = "BTC" | "ETH" | "XRP" | "SOL"

export type TradeSide = "UP" | "DOWN"

export interface User {
  _id: string
  safeWalletAddress?: string
  walletAddress?: string
  createdAt: Date
}

export interface Wallet {
  _id: string
  userId: string
  name: string
  address: string
  safeWalletAddress: string
  allowanceEnabled: boolean
}

export interface Strategy {
  _id: string
  userId: string
  walletId: string
  crypto: Crypto
  priceThreshold: number // Seuil en USD (valeur absolue de la différence)
  orderAmount: number // Quantité à trader (shares)
  orderPrice: number // Prix d'ordre en centimes (ex: 50 pour 0.5$)
  tradingWindowStartMinute: number // Minute de début (0-14)
  tradingWindowStartSecond: number // Seconde de début (0-59)
  buyUpOnly: boolean // Si true, seulement buy UP, sinon UP et DOWN
  enabled: boolean
  createdAt: Date
}

export interface Trade {
  _id: string
  strategyId: string
  marketId: string
  side: TradeSide
  price: number
  size: number
  status: string
  executedAt: Date
}

export interface PriceHistory {
  _id: string
  crypto: Crypto
  price: number
  timestamp: Date
}

export interface MarketData {
  id: string
  slug: string
  question: string
  active: boolean
  tokens: {
    yes: string
    no: string
  }
}

export interface PriceData {
  crypto: Crypto
  price: number
  timestamp: number
  openPrice?: number // Prix d'ouverture de la bougie 15m
}

export interface WalletBalance {
  usdc: number
  matic: number
  redeemablePositions: number
}

