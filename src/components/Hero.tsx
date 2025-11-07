"use client"

export function Hero() {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Automated Trading Bot for{" "}
          <span className="text-primary">Polymarket</span>
        </h2>
        <p className="text-xl text-muted-foreground mb-8">
          Execute strategies based on timing and price differences on 15-minute crypto markets. 
          Automated trading with Safe Wallet.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-lg border bg-card">
            <div className="text-3xl font-bold text-primary mb-2">4</div>
            <div className="text-sm text-muted-foreground">Supported Cryptos</div>
            <div className="text-xs text-muted-foreground mt-1">BTC, ETH, XRP, SOL</div>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <div className="text-3xl font-bold text-primary mb-2">15min</div>
            <div className="text-sm text-muted-foreground">Trading Candles</div>
            <div className="text-xs text-muted-foreground mt-1">Precise Timing</div>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <div className="text-3xl font-bold text-primary mb-2">100%</div>
            <div className="text-sm text-muted-foreground">Automated</div>
            <div className="text-xs text-muted-foreground mt-1">Safe Wallet multi-sig</div>
          </div>
        </div>
      </div>
    </section>
  )
}

