"use client"

export function Hero() {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-[linear-gradient(135deg,_rgba(12,9,32,0.92),_rgba(20,16,48,0.78))] p-8 shadow-[0_30px_80px_rgba(54,30,95,0.35)]">
        <div className="absolute -top-20 -left-10 h-52 w-52 rounded-full bg-[radial-gradient(circle,_rgba(51,197,255,0.35),_transparent_60%)] blur-2xl" aria-hidden />
        <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(139,91,255,0.35),_transparent_60%)] blur-[120px]" aria-hidden />

        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-secondary/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Web3 automation
          </span>
          <h2 className="mt-6 text-4xl md:text-5xl font-bold leading-tight">
            Automated Trading Bot for <span className="bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent">Polymarket</span>
          </h2>
          <p className="mt-5 text-base md:text-lg text-muted-foreground">
            Execute strategies on 15-minute markets, powered by Chainlink streams and Safe Wallet automation.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { label: "Supported Cryptos", value: "4", sub: "BTC · ETH · XRP · SOL" },
              { label: "Trading Candles", value: "15min", sub: "Precision windows" },
              { label: "Automation", value: "100%", sub: "Safe multi-sig" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border/50 bg-card/70 p-5 text-left shadow-[0_20px_45px_rgba(38,22,76,0.3)] backdrop-blur"
              >
                <div className="text-3xl font-semibold text-accent drop-shadow-[0_0_15px_rgba(51,197,255,0.35)]">{item.value}</div>
                <div className="text-sm font-semibold text-foreground/90">{item.label}</div>
                <div className="mt-1 text-[12px] uppercase tracking-[0.2em] text-muted-foreground">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

