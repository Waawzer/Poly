import { ClobClient, Side } from "@polymarket/clob-client"
import { BuilderConfig } from "@polymarket/builder-signing-sdk"
import { ethers } from "ethers"
import type { Crypto, TradeSide } from "@/types"

// Configuration du réseau Polygon
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com"
const POLYMARKET_CLOB_HOST = process.env.POLYMARKET_CLOB_HOST || "https://clob.polymarket.com"
const CHAIN_ID = parseInt(process.env.POLYGON_CHAIN_ID || "137") // Polygon Mainnet

// SignatureType enum - peut varier selon la version de @polymarket/clob-client
// Essayer d'importer, sinon utiliser la valeur numérique (3 = POLY_PROXY)
let SignatureTypeValue = 3 // Valeur par défaut pour POLY_PROXY
try {
  const clobClientModule = require("@polymarket/clob-client")
  if (clobClientModule.SignatureType && clobClientModule.SignatureType.POLY_PROXY !== undefined) {
    SignatureTypeValue = clobClientModule.SignatureType.POLY_PROXY
  }
} catch {
  // Si l'import échoue, utiliser la valeur par défaut
  SignatureTypeValue = 3
}

class PolymarketBuilderClient {
  private clobClient: ClobClient | null = null
  private provider: ethers.JsonRpcProvider | null = null
  private initialized: boolean = false

  /**
   * Initialise le client CLOB avec le builder signing
   */
  async initialize() {
    // Ne pas réinitialiser si déjà initialisé
    if (this.initialized && this.clobClient) {
      return
    }

    try {
      // Vérifier que les credentials builder sont configurés
      if (!process.env.POLY_BUILDER_API_KEY || !process.env.POLY_BUILDER_SECRET) {
        // Ne pas logger d'erreur si les credentials ne sont pas configurés
        // C'est normal en développement
        return
      }

      // Créer un provider pour Polygon
      this.provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL)

      // Configurer le builder signing avec notre route API interne
      const builderConfig = new BuilderConfig({
        remoteBuilderConfig: {
          url: process.env.NEXT_PUBLIC_BUILDER_SIGN_URL || "http://localhost:3000/api/builder/sign",
        },
      })

      // Créer le wallet dummy (non utilisé pour les signatures, mais requis par ClobClient)
      // Les signatures seront faites par le builder code via la route API
      const dummyWallet = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, this.provider)

      // Créer le client CLOB avec le builder signing
      this.clobClient = new ClobClient(
        POLYMARKET_CLOB_HOST,
        CHAIN_ID,
        dummyWallet,
        undefined, // pas de credentials utilisateur
        SignatureTypeValue, // Utiliser POLY_PROXY (valeur 3) pour le builder code
        undefined, // pas de funder address pour le builder code
        undefined,
        false,
        builderConfig
      )

      this.initialized = true
    } catch (error) {
      // Ne pas throw l'erreur pour ne pas bloquer le démarrage
      // L'initialisation peut être retentée plus tard
      this.initialized = false
    }
  }

  /**
   * Place un ordre sur Polymarket
   */
  async placeOrder(
    walletAddress: string,
    tokenId: string,
    side: TradeSide,
    price: number,
    size: number
  ) {
    if (!this.clobClient) {
      await this.initialize()
    }

    if (!this.clobClient) {
      throw new Error("Failed to initialize CLOB client")
    }

    try {
      // Convertir le côté du trade
      // Pour UP, on achète le token YES (Side.BUY)
      // Pour DOWN, on achète le token NO, donc on vend le token YES (Side.SELL)
      const orderSide = side === "UP" ? Side.BUY : Side.SELL

      // Créer l'ordre avec le wallet address spécifié
      const order = await this.clobClient.createOrder({
        price: price.toString(),
        side: orderSide,
        size: size.toString(),
        tokenID: tokenId,
        walletAddress: walletAddress.toLowerCase(),
      })

      // Envoyer l'ordre (la signature sera automatiquement gérée par le builder signing)
      const response = await this.clobClient.postOrder(order)

      return {
        success: true,
        orderId: response.id || response.order_id || response.clob_order_id,
        order: response,
      }
    } catch (error: any) {
      console.error("Error placing order:", error)
      throw error
    }
  }

  /**
   * Vérifie l'allowance actuelle
   */
  async checkAllowance(
    walletAddress: string,
    tokenId: string
  ): Promise<number> {
    if (!this.clobClient) {
      await this.initialize()
    }

    if (!this.clobClient || !this.provider) {
      throw new Error("Failed to initialize CLOB client")
    }

    try {
      // Vérifier l'allowance actuelle
      const allowance = await this.clobClient.getAllowance(walletAddress, tokenId)
      return allowance
    } catch (error) {
      console.error("Error checking allowance:", error)
      return 0
    }
  }

  /**
   * Vérifie si l'allowance est suffisante
   */
  async ensureAllowance(
    walletAddress: string,
    tokenId: string,
    amount: number
  ): Promise<boolean> {
    try {
      const allowance = await this.checkAllowance(walletAddress, tokenId)
      
      if (allowance < amount) {
        console.warn(
          `Insufficient allowance for wallet ${walletAddress}. Current: ${allowance}, Required: ${amount}`
        )
        return false
      }

      return true
    } catch (error) {
      console.error("Error checking allowance:", error)
      return false
    }
  }

  /**
   * Approuve une allowance (nécessite la signature du wallet de l'utilisateur)
   * Cette méthode ne peut pas être appelée automatiquement car elle nécessite
   * la signature de l'utilisateur. Elle doit être appelée depuis le client
   * avec le wallet connecté.
   */
  async approveAllowance(
    walletAddress: string,
    tokenId: string,
    amount: bigint | string,
    signer: any // ethers.Signer ou Safe Wallet signer
  ): Promise<string> {
    if (!this.clobClient) {
      await this.initialize()
    }

    if (!this.clobClient || !this.provider) {
      throw new Error("Failed to initialize CLOB client")
    }

    try {
      // Utiliser le ClobClient pour approuver l'allowance
      // Cela nécessite que signer soit le wallet de l'utilisateur
      const tx = await this.clobClient.approveAllowance({
        tokenID: tokenId,
        amount: amount.toString(),
        signer: signer,
      })

      return tx.hash || tx.transactionHash || ""
    } catch (error) {
      console.error("Error approving allowance:", error)
      throw error
    }
  }

  /**
   * Récupère le token ID pour un marché (YES ou NO)
   */
  getTokenId(marketTokenYes: string, marketTokenNo: string, side: TradeSide): string {
    // Pour un ordre UP, on achète le token YES
    // Pour un ordre DOWN, on achète le token NO (ou on vend le token YES)
    return side === "UP" ? marketTokenYes : marketTokenNo
  }
}

export const polymarketBuilder = new PolymarketBuilderClient()

