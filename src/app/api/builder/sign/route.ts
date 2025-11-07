import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

/**
 * Route API pour signer les requêtes avec le builder code
 * Cette route agit comme le serveur de signature builder
 * Format attendu par @polymarket/builder-signing-sdk
 */
export async function POST(request: NextRequest) {
  try {
    const { timestamp, method, path, body } = await request.json()

    const apiKey = process.env.POLY_BUILDER_API_KEY
    const secret = process.env.POLY_BUILDER_SECRET
    const passphrase = process.env.POLY_BUILDER_PASSPHRASE

    if (!apiKey || !secret || !passphrase) {
      return NextResponse.json(
        { error: "Builder credentials not configured" },
        { status: 500 }
      )
    }

    // Créer la chaîne à signer selon le format Polymarket
    // Format: timestamp + method + path + body (si présent)
    const message = timestamp + method + path + (body || "")

    // Signer avec HMAC SHA256
    const hmac = crypto.createHmac("sha256", Buffer.from(secret, "base64"))
    hmac.update(message)
    const signature = hmac.digest("base64")

    // Retourner les en-têtes d'authentification
    // Format attendu par le SDK
    return NextResponse.json({
      signature,
      apiKey,
      passphrase,
      timestamp: timestamp.toString(),
    })
  } catch (error: any) {
    console.error("Error signing builder request:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

