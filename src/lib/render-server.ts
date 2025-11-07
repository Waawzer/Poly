import "dotenv/config"
import { tradingEngine } from "./trading-engine"

async function main() {
  await tradingEngine.initialize()
  console.log("Trading engine initialized. Listening for price updates...")

  // keep process alive
  setInterval(() => {
    console.log("Engine heartbeat:", new Date().toISOString())
  }, 60_000)
}

main().catch((err) => {
  console.error("Fatal error", err)
  process.exit(1)
})