"use client"

import { useState, useEffect } from "react"
import { useAccount, useWalletClient } from "wagmi"
import { Button } from "@/components/ui/button"
import { useStore } from "@/store/useStore"
import { ethers } from "ethers"

interface ApproveAllowanceButtonProps {
  tokenId: string
  amount: number
  strategyId?: string
  onApproved?: () => void
}

// Adresse du contrat ConditionalTokens (Polymarket)
// Note: Ces valeurs sont définies dans .env.local
const CONDITIONAL_TOKENS_ADDRESS = process.env.NEXT_PUBLIC_CONDITIONAL_TOKENS_ADDRESS || "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045"
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

// ABI minimal pour approve
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
]

export function ApproveAllowanceButton({
  tokenId,
  amount,
  strategyId,
  onApproved,
}: ApproveAllowanceButtonProps) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const user = useStore((state) => state.user)
  const wallet = useStore((state) => state.wallet)

  const [allowance, setAllowance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Vérifier l'allowance actuelle
  useEffect(() => {
    if (!isConnected || !address || !wallet || !tokenId || !walletClient) return

    const checkAllowance = async () => {
      try {
        setLoading(true)
        // Vérifier l'allowance via l'API
        const response = await fetch(
          `/api/wallets/${wallet._id}/allowance?tokenId=${tokenId}&userId=${user?._id}`
        )
        const data = await response.json()
        if (data.success) {
          setAllowance(data.allowance || 0)
        }
      } catch (error) {
        console.error("Error checking allowance:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAllowance()
    // Vérifier toutes les 30 secondes
    const interval = setInterval(checkAllowance, 30000)
    return () => clearInterval(interval)
  }, [isConnected, address, wallet, tokenId, user, walletClient])

  const handleApprove = async () => {
    if (!isConnected || !address || !wallet || !walletClient) {
      setError("Please connect your wallet first")
      return
    }

    setApproving(true)
    setError(null)

    try {
      // Obtenir le provider et le signer depuis wagmi
      const provider = new ethers.BrowserProvider(walletClient as any)
      const signer = await provider.getSigner()

      // Utiliser le token ID directement comme adresse de token
      // Note: Pour Polymarket, le token ID est l'adresse du ConditionalToken
      const tokenContract = new ethers.Contract(tokenId, ERC20_ABI, signer)

      // Approuver une grande quantité pour éviter de réapprouver fréquemment
      // 1 million de tokens (ajustez selon vos besoins)
      const approvalAmount = ethers.parseUnits("1000000", "ether")

      // Approuver l'allowance pour le contrat ConditionalTokens
      const tx = await tokenContract.approve(CONDITIONAL_TOKENS_ADDRESS, approvalAmount)
      
      // Attendre la confirmation
      await tx.wait()

      if (onApproved) {
        onApproved()
      }

      // Re-vérifier l'allowance après confirmation
      const newAllowance = await tokenContract.allowance(address, CONDITIONAL_TOKENS_ADDRESS)
      setAllowance(Number(ethers.formatEther(newAllowance)))
    } catch (error: any) {
      console.error("Error approving allowance:", error)
      setError(error.message || "Failed to approve allowance. Please try again.")
    } finally {
      setApproving(false)
    }
  }

  const hasEnoughAllowance = allowance !== null && allowance >= amount

  if (!isConnected) {
    return (
      <span className="text-sm text-muted-foreground">Connect wallet to approve</span>
    )
  }

  if (hasEnoughAllowance) {
    return (
      <span className="text-sm text-green-600 dark:text-green-400">
        ✓ Allowance approved ({allowance.toFixed(2)})
      </span>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleApprove}
        disabled={approving || loading}
        size="sm"
        variant="outline"
      >
        {approving ? "Approving..." : "Approve Allowance"}
      </Button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {allowance !== null && !hasEnoughAllowance && (
        <p className="text-xs text-muted-foreground">
          Current: {allowance.toFixed(2)} | Required: {amount}
        </p>
      )}
      {loading && (
        <p className="text-xs text-muted-foreground">Checking allowance...</p>
      )}
    </div>
  )
}

