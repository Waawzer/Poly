import mongoose, { Schema, Document } from "mongoose"

export interface ITrade extends Document {
  strategyId: mongoose.Types.ObjectId
  marketId: string
  side: "UP" | "DOWN"
  price: number
  size: number
  status: string
  executedAt: Date
}

const TradeSchema = new Schema<ITrade>(
  {
    strategyId: {
      type: Schema.Types.ObjectId,
      ref: "Strategy",
      required: true,
      index: true,
    },
    marketId: {
      type: String,
      required: true,
      index: true,
    },
    side: {
      type: String,
      enum: ["UP", "DOWN"],
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "pending",
    },
    executedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index pour les requêtes d'historique
TradeSchema.index({ strategyId: 1, executedAt: -1 })
TradeSchema.index({ executedAt: -1 })

export default mongoose.models.Trade || mongoose.model<ITrade>("Trade", TradeSchema)

