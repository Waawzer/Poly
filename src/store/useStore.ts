import { create } from "zustand"
import type { User, Wallet, Strategy, PriceData, Trade } from "@/types"

interface AppState {
  user: User | null
  wallet: Wallet | null
  strategies: Strategy[]
  prices: Record<string, PriceData>
  trades: Trade[]

  setUser: (user: User | null) => void
  setWallet: (wallet: Wallet | null) => void
  setStrategies: (strategies: Strategy[]) => void
  addStrategy: (strategy: Strategy) => void
  updateStrategy: (id: string, updates: Partial<Strategy>) => void
  removeStrategy: (id: string) => void
  setPrices: (prices: Record<string, PriceData>) => void
  updatePrice: (crypto: string, price: PriceData) => void
  setTrades: (trades: Trade[]) => void
  addTrade: (trade: Trade) => void
}

export const useStore = create<AppState>((set) => ({
  user: null,
  wallet: null,
  strategies: [],
  prices: {},
  trades: [],

  setUser: (user) => set({ user }),
  setWallet: (wallet) => set({ wallet }),
  setStrategies: (strategies) => set({ strategies }),
  addStrategy: (strategy) => set((state) => ({ strategies: [...state.strategies, strategy] })),
  updateStrategy: (id, updates) =>
    set((state) => ({
      strategies: state.strategies.map((s) => (s._id === id ? { ...s, ...updates } : s)),
    })),
  removeStrategy: (id) =>
    set((state) => ({ strategies: state.strategies.filter((s) => s._id !== id) })),
  setPrices: (prices) => set({ prices }),
  updatePrice: (crypto, price) =>
    set((state) => ({ prices: { ...state.prices, [crypto]: price } })),
  setTrades: (trades) => set({ trades }),
  addTrade: (trade) => set((state) => ({ trades: [trade, ...state.trades] })),
}))

