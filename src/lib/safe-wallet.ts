import SafeAppsSDK from "@safe-global/safe-apps-sdk"
import { ethers } from "ethers"

// Client-side only
export function getSDK() {
  if (typeof window === "undefined") {
    throw new Error("Safe Wallet SDK should only be used client-side")
  }
  
      // Check if we're in a Safe Wallet iframe
      if (window.parent === window) {
        // Not in an iframe, might not be in Safe Wallet
      }
  
  const opts = {
    allowedDomains: [
      process.env.NEXT_PUBLIC_SAFE_APP_URL || "http://localhost:3000",
      "https://app.safe.global",
      "https://safe-apps.dev.5afe.dev",
    ],
    debug: process.env.NODE_ENV === "development",
  }
  return new SafeAppsSDK(opts)
}

// For client-side usage
let sdkInstance: SafeAppsSDK | null = null
if (typeof window !== "undefined") {
  sdkInstance = getSDK()
}
export const sdk = sdkInstance

/**
 * Initialize Safe Wallet connection
 */
export async function initSafeWallet() {
  try {
    const sdkInstance = getSDK()
    
    // Check if we're in a Safe Wallet environment
    if (!sdkInstance) {
      throw new Error("Safe Wallet SDK not available. Please open this app in Safe Wallet.")
    }

    // For Safe Apps SDK, we need to use the safe property
    // The SDK structure: sdkInstance.safe.getSafeInfo()
    let safeInfo
    
    // Check if safe property exists
    if (!sdkInstance.safe) {
      throw new Error("Safe Wallet not detected. Please open this app in Safe Wallet.")
    }

    // Try to call getSafeInfo - it should be available on the safe object
    try {
      // The correct way for Safe Apps SDK v9
      safeInfo = await sdkInstance.safe.getSafeInfo()
    } catch (methodError: any) {
      // If getSafeInfo doesn't exist, the SDK might be initialized differently
      console.error("getSafeInfo method error:", methodError)
      
      // Check if the safe object has the info directly
      const safeObj = sdkInstance.safe as any
      if (safeObj && (safeObj.safeAddress || safeObj.getSafeInfo)) {
        // Try alternative method name
        if (typeof safeObj.getSafeInfo === 'function') {
          safeInfo = await safeObj.getSafeInfo()
        } else if (safeObj.safeAddress) {
          // Info might be available synchronously
          safeInfo = {
            safeAddress: safeObj.safeAddress,
            chainId: safeObj.chainId || 137,
            owners: safeObj.owners || [],
            threshold: safeObj.threshold || 1,
            isReadOnly: safeObj.isReadOnly || false,
          }
        }
      }
      
      // If still no info, throw a helpful error
      if (!safeInfo) {
        throw new Error(
          "Unable to get Safe Wallet info. " +
          "The SDK might not be properly initialized. " +
          "Please ensure you're opening this app from within Safe Wallet. " +
          "Original error: " + methodError.message
        )
      }
    }

    if (!safeInfo || !safeInfo.safeAddress) {
      throw new Error("Unable to get Safe Wallet address. Please ensure you're using Safe Wallet.")
    }

    return safeInfo
  } catch (error: any) {
    console.error("Error initializing Safe Wallet:", error)
    // Re-throw with a more helpful message
    if (error.message?.includes("Safe Wallet") || error.message?.includes("SDK")) {
      throw error
    }
    throw new Error("Failed to connect to Safe Wallet: " + (error.message || "Unknown error"))
  }
}

/**
 * Crée un provider Ethers.js à partir de Safe Wallet
 * Note: Cette fonction nécessite une implémentation personnalisée du provider
 */
export async function getSafeProvider(): Promise<ethers.JsonRpcProvider | null> {
  try {
    const rpcUrl = process.env.POLYGON_RPC_URL
    if (!rpcUrl) {
      console.error("POLYGON_RPC_URL not configured")
      return null
    }
    // Utiliser le RPC Polygon directement
    // Pour les transactions, utiliser les méthodes Safe SDK
    return new ethers.JsonRpcProvider(rpcUrl)
  } catch (error) {
    console.error("Error getting Safe provider:", error)
    return null
  }
}

/**
 * Get the connected Safe Wallet address
 */
export async function getSafeAddress(): Promise<string | null> {
  try {
    const safeInfo = await initSafeWallet()
    return safeInfo.safeAddress
  } catch (error) {
    console.error("Error getting Safe address:", error)
    return null
  }
}

/**
 * Signe un message avec Safe Wallet
 */
export async function signMessage(message: string): Promise<string> {
  try {
    const safe = await sdk.safe.getSafeInfo()
    const provider = await getSafeProvider()
    if (!provider) {
      throw new Error("Safe provider not available")
    }

    const signer = await provider.getSigner()
    const signature = await signer.signMessage(message)
    return signature
  } catch (error) {
    console.error("Error signing message:", error)
    throw error
  }
}

/**
 * Approuve un token (USDC) pour Polymarket
 */
export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint
): Promise<string> {
  try {
    const provider = await getSafeProvider()
    if (!provider) {
      throw new Error("Safe provider not available")
    }

    // ERC20 ABI pour approve
    const erc20Abi = [
      "function approve(address spender, uint256 amount) external returns (bool)",
    ]

    const signer = await provider.getSigner()
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer)

    const tx = await tokenContract.approve(spenderAddress, amount)
    await tx.wait()

    return tx.hash
  } catch (error) {
    console.error("Error approving token:", error)
    throw error
  }
}

/**
 * Récupère le solde USDC d'un wallet
 */
export async function getUSDCBalance(walletAddress: string): Promise<number> {
  try {
    const provider = await getSafeProvider()
    if (!provider) {
      throw new Error("Safe provider not available")
    }

    // Adresse USDC sur Polygon (à vérifier)
    const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
    const USDC_ABI = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
    ]

    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
    const balance = await usdcContract.balanceOf(walletAddress)
    const decimals = await usdcContract.decimals()

    return Number(ethers.formatUnits(balance, decimals))
  } catch (error) {
    console.error("Error getting USDC balance:", error)
    return 0
  }
}

/**
 * Récupère le solde MATIC d'un wallet
 */
export async function getMATICBalance(walletAddress: string): Promise<number> {
  try {
    const provider = await getSafeProvider()
    if (!provider) {
      throw new Error("Safe provider not available")
    }

    const balance = await provider.getBalance(walletAddress)
    return Number(ethers.formatEther(balance))
  } catch (error) {
    console.error("Error getting MATIC balance:", error)
    return 0
  }
}

