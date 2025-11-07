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
    <section className="container mx-auto px-4 py-16 bg-muted/50">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Features</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A complete automated trading system for Polymarket
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <div key={index} className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

