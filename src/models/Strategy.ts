import mongoose, { Schema, Document } from "mongoose"

export interface IStrategy extends Document {
  userId: mongoose.Types.ObjectId
  walletId: mongoose.Types.ObjectId
  crypto: "BTC" | "ETH" | "XRP" | "SOL"
  priceThreshold: number // Seuil en USD (valeur absolue de la différence)
  orderAmount: number // Quantité à trader (shares)
  orderPrice: number // Prix d'ordre en centimes (ex: 50 pour 0.5$)
  tradingWindowStartMinute: number // Minute de début (0-14)
  tradingWindowStartSecond: number // Seconde de début (0-59)
  buyUpOnly: boolean // Si true, seulement buy UP, sinon UP et DOWN
  enabled: boolean
  createdAt: Date
}

const StrategySchema = new Schema<IStrategy>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    walletId: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },
    crypto: {
      type: String,
      enum: ["BTC", "ETH", "XRP", "SOL"],
      required: true,
    },
    priceThreshold: {
      type: Number,
      required: true,
      min: 0,
    },
    orderAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    orderPrice: {
      type: Number,
      required: false, // Permettre null pour les anciennes stratégies
      min: 0,
      max: 100, // 0 à 100 centimes (0$ à 1$)
      default: null,
    },
    tradingWindowStartMinute: {
      type: Number,
      required: true,
      min: 0,
      max: 14,
    },
    tradingWindowStartSecond: {
      type: Number,
      required: true,
      min: 0,
      max: 59,
    },
    buyUpOnly: {
      type: Boolean,
      default: false,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

// Index composé pour les requêtes fréquentes
StrategySchema.index({ userId: 1, enabled: 1 })
StrategySchema.index({ walletId: 1, enabled: 1 })

export default mongoose.models.Strategy || mongoose.model<IStrategy>("Strategy", StrategySchema)

