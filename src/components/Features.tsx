"use client"

export function Features() {
  const features = [
    {
      title: "Multi-Market Trading",
      description: "Support for 4 cryptos with multiple simultaneous strategies per wallet",
      icon: "📊",
    },
    {
      title: "Timing-Based Strategy",
      description: "Trading on 15-minute candles with configurable windows (0-14 min)",
      icon: "⏰",
    },
    {
      title: "Real-Time Prices",
      description: "Chainlink Data Streams via WebSocket for BTC, ETH, XRP, SOL",
      icon: "📡",
    },
    {
      title: "Multi-Wallet Management",
      description: "Safe Wallet multi-sig with secure authentication",
      icon: "🔐",
    },
    {
      title: "Automatic Redeem",
      description: "Automatic redeem every hour at :00",
      icon: "🔄",
    },
    {
      title: "Complete Dashboard",
      description: "Intuitive interface with real-time prices and strategy management",
      icon: "📈",
    },
  ]

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">Everything you need to run a Polymarket bot</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Purpose-built automation with Safe Wallet support, rapid execution, and realtime monitoring.
        </p>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <div
            key={index}
            className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 p-5 shadow-[0_20px_50px_rgba(33,22,68,0.35)] transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(51,197,255,0.25),_transparent_55%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/25 text-xl text-primary-foreground">
                {feature.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

