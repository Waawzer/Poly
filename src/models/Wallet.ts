import mongoose, { Schema, Document } from "mongoose"

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  address: string
  safeWalletAddress: string
  allowanceEnabled: boolean
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    safeWalletAddress: {
      type: String,
      required: true,
    },
    allowanceEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.Wallet || mongoose.model<IWallet>("Wallet", WalletSchema)

