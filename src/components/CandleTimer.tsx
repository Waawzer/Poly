"use client"

import { useEffect, useState } from "react"
import { getExactCandleTimestamp } from "@/lib/utils"

export function CandleTimer() {
  const [minutes, setMinutes] = useState(0)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now()
      const candleStart = getExactCandleTimestamp(now)
      const elapsed = now - candleStart
      
      // Calculer les minutes et secondes écoulées depuis le début de la bougie
      const totalSeconds = Math.floor(elapsed / 1000)
      const mins = Math.floor(totalSeconds / 60)
      const secs = totalSeconds % 60
      
      // Limiter à 14:59 maximum (car les bougies durent 15 minutes)
      if (mins >= 15) {
        setMinutes(14)
        setSeconds(59)
      } else {
        setMinutes(mins)
        setSeconds(secs)
      }
    }

    // Mettre à jour immédiatement
    updateTimer()

    // Mettre à jour toutes les secondes
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
      <span className="text-sm font-medium text-muted-foreground">Candle:</span>
      <span className="text-sm font-mono font-semibold">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  )
}

