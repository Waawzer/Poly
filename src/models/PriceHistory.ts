import mongoose, { Schema, Document } from "mongoose"

export interface IPriceHistory extends Document {
  crypto: "BTC" | "ETH" | "XRP" | "SOL"
  price: number
  timestamp: Date
}

const PriceHistorySchema = new Schema<IPriceHistory>(
  {
    crypto: {
      type: String,
      enum: ["BTC", "ETH", "XRP", "SOL"],
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index composé pour les requêtes temporelles
PriceHistorySchema.index({ crypto: 1, timestamp: -1 })

// TTL index pour auto-nettoyage (garder 30 jours)
PriceHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

export default mongoose.models.PriceHistory || mongoose.model<IPriceHistory>("PriceHistory", PriceHistorySchema)

