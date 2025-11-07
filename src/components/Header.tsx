"use client"

import { useStore } from "@/store/useStore"
import { WalletConnectButton } from "@/components/WalletConnectButton"
import { ApproveAllContractsButton } from "@/components/ApproveAllContractsButton"

export function Header() {
  const user = useStore((state) => state.user)

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Poly Trading Bot</h1>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">
                  {user.safeWalletAddress?.slice(0, 6) || user.walletAddress?.slice(0, 6)}...
                  {user.safeWalletAddress?.slice(-4) || user.walletAddress?.slice(-4)}
                </span>
              </div>
              <div className="relative">
                <ApproveAllContractsButton />
              </div>
            </>
          )}
          <WalletConnectButton />
        </div>
      </div>
    </header>
  )
}

