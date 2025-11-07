"use client"

import { Header } from "@/components/Header"
import { LivePricesBar } from "@/components/LivePricesBar"
import { Hero } from "@/components/Hero"
import { Features } from "@/components/Features"
import { Dashboard } from "@/components/Dashboard"
import { useStore } from "@/store/useStore"

export default function Home() {
  const user = useStore((state) => state.user)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <LivePricesBar />
      <main className="flex-1">
        {!user ? (
          <>
            <Hero />
            <Features />
          </>
        ) : (
          <Dashboard />
        )}
      </main>
      <footer className="border-t py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Poly Trading Bot - Automated Trading for Polymarket</p>
        </div>
      </footer>
    </div>
  )
}
