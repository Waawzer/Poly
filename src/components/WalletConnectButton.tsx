"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { useAccount, useDisconnect } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useStore } from "@/store/useStore"
import { initSafeWallet } from "@/lib/safe-wallet"

export function WalletConnectButton() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const setUser = useStore((state) => state.setUser)
  const setWallet = useStore((state) => state.setWallet)
  const user = useStore((state) => state.user)

  const [checkingSafe, setCheckingSafe] = useState(false)

  const handleWalletAuth = useCallback(async (walletAddress: string) => {
    try {
      // Authenticate with backend
      const response = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      })

      const data = await response.json()
      if (data.success) {
        setUser(data.user)
        // Set the wallet directly
        if (data.wallet) {
          setWallet(data.wallet)
        }
      }
    } catch (error) {
      console.error("Error authenticating wallet:", error)
    }
  }, [setUser, setWallet])

  const handleSafeWalletAuth = useCallback(async (safeAddress: string) => {
    try {
      // Authenticate with backend
      const response = await fetch("/api/auth/safe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ safeWalletAddress: safeAddress }),
      })

      const data = await response.json()
      if (data.success) {
        setUser(data.user)
        // Set the wallet directly
        if (data.wallet) {
          setWallet(data.wallet)
        }
      }
    } catch (error) {
      console.error("Error authenticating Safe Wallet:", error)
    }
  }, [setUser, setWallet])

  const handleDisconnect = useCallback(() => {
    setUser(null)
    setWallet(null)
  }, [setUser, setWallet])

  // Custom disconnect handler
  const handleCustomDisconnect = useCallback(() => {
    if (isConnected) {
      disconnect()
    }
    handleDisconnect()
  }, [disconnect, handleDisconnect, isConnected])

  // Check if we're in Safe Wallet environment
  useEffect(() => {
    if (checkingSafe) {
      return
    }

    const checkSafeWallet = async () => {
      // Only check if not already connected via wagmi
      if (!isConnected && !user) {
        try {
          setCheckingSafe(true)
          const safe = await initSafeWallet()
          if (safe?.safeAddress) {
            // We're in Safe Wallet, authenticate
            await handleSafeWalletAuth(safe.safeAddress)
          }
        } catch (error) {
          // Not in Safe Wallet, that's fine
        } finally {
          setCheckingSafe(false)
        }
      }
    }

    checkSafeWallet()
  }, [checkingSafe, handleSafeWalletAuth, isConnected, user])

  // Handle wallet connection via wagmi
  useEffect(() => {
    if (isConnected && address) {
      // Check if user exists and matches the connected address
      const userAddress = user?.walletAddress || user?.safeWalletAddress
      if (!user || userAddress?.toLowerCase() !== address.toLowerCase()) {
        handleWalletAuth(address)
      }
    } else if (!isConnected && user) {
      // Wallet disconnected, clear user only if it was a regular wallet (not Safe)
      const userAddress = user?.walletAddress
      if (userAddress) {
        handleDisconnect()
      }
    }
  }, [address, handleDisconnect, handleWalletAuth, isConnected, user])

  return (
    <div className="flex items-center gap-2">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          // Note: If your app doesn't use authentication, you
          // can remove all 'authenticationStatus' checks
          const ready = mounted && authenticationStatus !== "loading"
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus ||
              authenticationStatus === "authenticated")

          return (
            <div
              {...(!ready && {
                "aria-hidden": true,
                style: {
                  opacity: 0,
                  pointerEvents: "none",
                  userSelect: "none",
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      Connect Wallet
                    </button>
                  )
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
                    >
                      Wrong network
                    </button>
                  )
                }

                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-md transition-colors text-sm"
                    >
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            overflow: "hidden",
                            marginRight: 4,
                          }}
                        >
                          {chain.iconUrl && (
                            <Image
                              alt={chain.name ?? "Chain icon"}
                              src={chain.iconUrl}
                              width={12}
                              height={12}
                              style={{ width: 12, height: 12 }}
                              unoptimized
                            />
                          )}
                        </div>
                      )}
                      {chain.name}
                    </button>

                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-md transition-colors text-sm font-medium"
                    >
                      {account.displayName}
                      {account.displayBalance
                        ? ` (${account.displayBalance})`
                        : ""}
                    </button>
                  </div>
                )
              })()}
            </div>
          )
        }}
      </ConnectButton.Custom>
      {user && (
        <button
          onClick={handleCustomDisconnect}
          className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-md transition-colors text-sm font-medium"
        >
          Disconnect
        </button>
      )}
    </div>
  )
}

