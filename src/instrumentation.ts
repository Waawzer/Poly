/**
 * Next.js Instrumentation Hook
 * S'exécute automatiquement au démarrage du serveur Next.js
 * Permet d'initialiser les services serveur (trading engine, Chainlink, etc.)
 * L'initialisation est non-bloquante pour permettre un démarrage rapide
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Ne pas attendre l'initialisation pour permettre au serveur de démarrer rapidement
    // L'initialisation se fera en arrière-plan
    import('./lib/server-init').then(({ initializeServer }) => {
      initializeServer().catch((error) => {
        // Erreur silencieuse - l'initialisation peut être retentée plus tard
        if (process.env.NODE_ENV === 'development') {
          console.warn('Server initialization started in background (non-blocking)')
        }
      })
    })
  }
}

