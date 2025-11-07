import mongoose, { Schema, Document } from "mongoose"

export interface IUser extends Document {
  safeWalletAddress?: string
  walletAddress?: string
  createdAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    safeWalletAddress: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true,
    },
    walletAddress: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
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

// Ensure at least one address is provided
UserSchema.pre("validate", function (next) {
  if (!this.safeWalletAddress && !this.walletAddress) {
    next(new Error("Either safeWalletAddress or walletAddress must be provided"))
  } else {
    next()
  }
})

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)

