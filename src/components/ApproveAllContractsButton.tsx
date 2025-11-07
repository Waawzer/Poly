"use client"

import { useState, useEffect } from "react"
import { useAccount, useWalletClient, usePublicClient } from "wagmi"
import { Button } from "@/components/ui/button"
import { useStore } from "@/store/useStore"
import { ethers } from "ethers"


interface ApprovalInfo {
  walletAddress: string
  usdcAddress: string
  addressesToApprove: Record<string, string>
}

interface AllowanceStatus {
  name: string
  address: string
  allowance: number
  needsApproval: boolean
  requiredAmount?: number
}

// ABI minimal pour USDC (approve et allowance)
const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
]

// Adresse Polymarket Exchange (nécessite un montant élevé d'allowance)
const POLYMARKET_EXCHANGE_ADDRESS = (process.env.NEXT_PUBLIC_POLYMARKET_EXCHANGE_ADDRESS as string) || "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"

// Adresses des contrats Polymarket (valeurs par défaut si env vars ne sont pas définies)
const getDefaultApprovalInfo = (walletAddress: string): ApprovalInfo => ({
  walletAddress,
  usdcAddress: (process.env.NEXT_PUBLIC_USDC_ADDRESS as string) || "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  addressesToApprove: {
    "Polymarket Exchange": POLYMARKET_EXCHANGE_ADDRESS,
    "CTF Exchange": (process.env.NEXT_PUBLIC_CTF_EXCHANGE_ADDRESS as string) || "0xC5d563A36AE78145C45a50134d48A1215220f80a",
    "ConditionalTokens": (process.env.NEXT_PUBLIC_CONDITIONAL_TOKENS_ADDRESS as string) || "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045",
    "Neg Risk CTF Exchange": (process.env.NEXT_PUBLIC_NEG_RISK_CTF_EXCHANGE_ADDRESS as string) || "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",
  },
})

// Vérifie si une adresse nécessite un montant élevé d'allowance
const requiresHighAllowance = (address: string): boolean => {
  return address.toLowerCase() === POLYMARKET_EXCHANGE_ADDRESS.toLowerCase()
}

// Montant minimum d'allowance requis selon l'adresse
const getRequiredAllowance = (address: string): number => {
  return requiresHighAllowance(address) ? 100 : 1 // 100 USDC pour Polymarket Exchange, 1 USDC pour les autres
}

export function ApproveAllContractsButton() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const user = useStore((state) => state.user)
  const wallet = useStore((state) => state.wallet)

  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [approving, setApproving] = useState(false)
  const [allowances, setAllowances] = useState<AllowanceStatus[]>([])
  const [approvalInfo, setApprovalInfo] = useState<ApprovalInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [isDark, setIsDark] = useState(false)

  // Détecter le mode sombre
  useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        setIsDark(
          window.matchMedia('(prefers-color-scheme: dark)').matches ||
          document.documentElement.classList.contains('dark')
        )
      }
    }
    checkDarkMode()
    
    // Écouter les changements de thème
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkDarkMode)
    return () => mediaQuery.removeEventListener('change', checkDarkMode)
  }, [])

  // Charger les informations d'approbation
  useEffect(() => {
    if (!isConnected || !address) return
    // Utiliser l'adresse du wallet connecté si le wallet du store n'est pas disponible
    const walletAddress = wallet?.address || address
    const userId = user?._id

    if (!walletAddress || !userId) {
      // Si pas de userId, essayer de récupérer le wallet depuis l'API
      if (walletAddress && !userId) {
        // Essayer de charger le wallet depuis l'API
        fetch(`/api/wallets?address=${walletAddress}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.wallet && data.user) {
              // Mettre à jour le store si nécessaire
            }
          })
          .catch(() => {
            // Ignorer les erreurs
          })
      }
      return
    }

    const fetchApprovalInfo = async () => {
      try {
        const response = await fetch(
          `/api/wallets/approve-all-contracts?walletAddress=${walletAddress}&userId=${userId}`
        )
        const data = await response.json()
        if (data.success) {
          setApprovalInfo(data)
        } else {
          // Si le wallet n'est pas trouvé, utiliser les valeurs par défaut
          setApprovalInfo(getDefaultApprovalInfo(walletAddress))
        }
      } catch (error) {
        console.error("Error fetching approval info:", error)
        // Utiliser les valeurs par défaut en cas d'erreur
        setApprovalInfo(getDefaultApprovalInfo(walletAddress))
      }
    }

    fetchApprovalInfo()
  }, [isConnected, address, wallet, user])

  // Vérifier les allowances actuelles
  const checkAllowances = async () => {
    if (!isConnected || !address || !walletClient) {
      setError("Please connect your wallet first")
      return
    }

    // Si approvalInfo n'est pas chargé, le charger maintenant
    if (!approvalInfo) {
      const walletAddress = wallet?.address || address
      const userId = user?._id

      if (!walletAddress) {
        setError("Wallet address not found")
        return
      }

      try {
        // Essayer de charger depuis l'API
        if (userId) {
          const response = await fetch(
            `/api/wallets/approve-all-contracts?walletAddress=${walletAddress}&userId=${userId}`
          )
          const data = await response.json()
          if (data.success) {
            setApprovalInfo(data)
          }
        }

        // Si toujours pas d'approvalInfo, utiliser les valeurs par défaut
        if (!approvalInfo) {
          setApprovalInfo(getDefaultApprovalInfo(walletAddress))
        }
      } catch (error) {
        // Utiliser les valeurs par défaut même en cas d'erreur
        setApprovalInfo(getDefaultApprovalInfo(walletAddress))
      }
    }

    // Utiliser approvalInfo ou les valeurs par défaut
    const currentApprovalInfo = approvalInfo || getDefaultApprovalInfo(wallet?.address || address)

    if (!currentApprovalInfo) {
      setError("Could not load approval information")
      return
    }

    setChecking(true)
    setError(null)
    setSuccess(null)

    try {
      const provider = new ethers.BrowserProvider(walletClient as any)
      const usdcContract = new ethers.Contract(
        currentApprovalInfo.usdcAddress,
        USDC_ABI,
        provider
      )

      const decimals = await usdcContract.decimals()
      const allowancePromises = Object.entries(currentApprovalInfo.addressesToApprove).map(
        async ([name, contractAddress]) => {
          try {
            const allowance = await usdcContract.allowance(address, contractAddress)
            const allowanceAmount = Number(ethers.formatUnits(allowance, decimals))
            const requiredAmount = getRequiredAllowance(contractAddress)
            return {
              name,
              address: contractAddress,
              allowance: allowanceAmount,
              needsApproval: allowanceAmount < requiredAmount,
              requiredAmount,
            }
          } catch (error) {
            console.error(`Error checking allowance for ${name}:`, error)
            const requiredAmount = getRequiredAllowance(contractAddress)
            return {
              name,
              address: contractAddress,
              allowance: 0,
              needsApproval: true,
              requiredAmount,
            }
          }
        }
      )

      const results = await Promise.all(allowancePromises)
      setAllowances(results)
    } catch (error: any) {
      console.error("Error checking allowances:", error)
      setError(error.message || "Failed to check allowances")
    } finally {
      setChecking(false)
    }
  }


  // Approuver tous les contrats qui en ont besoin
  const approveAllContracts = async () => {
    if (!isConnected || !address || !walletClient) {
      setError("Please connect your wallet first")
      return
    }

    // Obtenir les infos d'approbation (utiliser les valeurs par défaut si nécessaire)
    const walletAddress = wallet?.address || address
    const currentApprovalInfo = approvalInfo || getDefaultApprovalInfo(walletAddress)

    const contractsToApprove = allowances.filter((a) => a.needsApproval)
    if (contractsToApprove.length === 0) {
      setSuccess("All contracts already approved!")
      return
    }

    setApproving(true)
    setError(null)
    setSuccess(null)

    try {
      const provider = new ethers.BrowserProvider(walletClient as any)
      const signer = await provider.getSigner()
      const usdcContract = new ethers.Contract(
        currentApprovalInfo.usdcAddress,
        USDC_ABI,
        signer
      )

      const decimals = await usdcContract.decimals()
      let successful = 0
      let failed = 0

      for (const contract of contractsToApprove) {
        try {
          console.log(`Approving ${contract.name}...`)
          
          // Déterminer le montant d'approbation selon l'adresse
          const requiresHigh = requiresHighAllowance(contract.address)
          const approvalAmountStr = requiresHigh ? "10000" : "1" // 100k USDC pour Polymarket Exchange, 1k pour les autres
          const approveAmount = ethers.parseUnits(approvalAmountStr, decimals)
          
          // Estimer le gas
          const gasEstimate = await usdcContract.approve.estimateGas(
            contract.address,
            approveAmount
          )

          // Envoyer la transaction
          const tx = await usdcContract.approve(contract.address, approveAmount, {
            gasLimit: gasEstimate + BigInt(10000), // Ajouter un buffer
          })

          // Attendre la confirmation
          const receipt = await tx.wait()

          if (receipt.status === 1) {
            successful++
            console.log(`✅ Approved ${contract.name}: ${receipt.hash}`)
          } else {
            failed++
            console.error(`❌ Failed to approve ${contract.name}`)
          }

          // Petite pause entre les transactions
          if (contractsToApprove.indexOf(contract) < contractsToApprove.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        } catch (error: any) {
          failed++
          console.error(`Error approving ${contract.name}:`, error)
          // Continuer avec les autres contrats même en cas d'erreur
        }
      }

      if (successful > 0) {
        setSuccess(`Successfully approved ${successful} contract(s)${failed > 0 ? ` (${failed} failed)` : ""}`)
        // Re-vérifier les allowances
        await checkAllowances()
      } else {
        setError(`Failed to approve contracts. ${failed} failed.`)
      }
    } catch (error: any) {
      console.error("Error approving contracts:", error)
      setError(error.message || "Failed to approve contracts")
    } finally {
      setApproving(false)
    }
  }

  // Afficher le composant si le wallet est connecté (peut utiliser address même sans wallet dans le store)
  if (!isConnected || !address) {
    return null
  }

  const allApproved = allowances.length > 0 && allowances.every((a) => !a.needsApproval)
  const needsApproval = allowances.filter((a) => a.needsApproval).length

  return (
    <div className="relative flex items-center gap-2">
      <Button
        onClick={checkAllowances}
        disabled={checking || approving || !isConnected || !address}
        size="sm"
        variant="outline"
      >
        {checking ? "Checking..." : "Check Allowances"}
      </Button>

      {allowances.length > 0 && (
        <>
          {allApproved ? (
            <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
              ✓ All approved
            </span>
          ) : (
            <Button
              onClick={approveAllContracts}
              disabled={approving || checking}
              size="sm"
              variant="default"
            >
              {approving
                ? `Approving ${needsApproval}...`
                : `Approve ${needsApproval} Contract(s)`}
            </Button>
          )}
          <Button
            onClick={() => setShowDetails(!showDetails)}
            size="sm"
            variant="ghost"
            className="h-7 px-2"
          >
            {showDetails ? "▲" : "▼"}
          </Button>
        </>
      )}

      {error && (
        <span className="text-xs text-red-600 dark:text-red-400 max-w-[200px] truncate" title={error}>
          {error}
        </span>
      )}
      {success && (
        <span className="text-xs text-green-600 dark:text-green-400 max-w-[200px] truncate" title={success}>
          {success}
        </span>
      )}

      {allowances.length > 0 && showDetails && (
        <div 
          className="absolute top-full right-0 mt-2 border rounded-md shadow-xl p-3 min-w-[350px] max-h-[300px] overflow-y-auto"
          style={{ 
            backgroundColor: isDark ? 'rgb(10, 10, 10)' : 'rgb(255, 255, 255)',
            borderColor: isDark ? 'rgb(38, 38, 38)' : 'rgb(229, 229, 229)',
            zIndex: 9999,
            position: 'absolute',
            opacity: 1,
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          }}
        >
          <div 
            className="text-xs font-semibold mb-2"
            style={{ color: isDark ? 'rgb(237, 237, 237)' : 'rgb(23, 23, 23)' }}
          >
            Allowance Status:
          </div>
          {allowances.map((allowance) => (
            <div
              key={allowance.address}
              className="text-xs py-2 border-b last:border-0"
              style={{ borderColor: isDark ? 'rgb(38, 38, 38)' : 'rgb(229, 229, 229)' }}
            >
              <div className="flex justify-between items-center">
                <span 
                  className="font-medium"
                  style={{ color: isDark ? 'rgb(237, 237, 237)' : 'rgb(23, 23, 23)' }}
                >
                  {allowance.name}
                </span>
                <span
                  style={{
                    color: allowance.needsApproval 
                      ? 'rgb(239, 68, 68)' 
                      : 'rgb(34, 197, 94)',
                    fontWeight: allowance.needsApproval ? '600' : '400',
                  }}
                >
                  {allowance.needsApproval
                    ? `❌ Needs approval (min: ${allowance.requiredAmount || 1} USDC)`
                    : `✓ ${allowance.allowance.toFixed(2)} USDC`}
                </span>
              </div>
              <div 
                className="text-[10px] mt-1 truncate"
                style={{ color: isDark ? 'rgb(163, 163, 163)' : 'rgb(115, 115, 115)' }}
              >
                {allowance.address}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

