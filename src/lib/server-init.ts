/**
 * Module d'initialisation serveur
 * Initialise automatiquement le trading engine au démarrage du serveur Next.js
 * L'initialisation est asynchrone et non-bloquante pour permettre au serveur de démarrer rapidement
 */

import { tradingEngine } from "./trading-engine"
import { getChainlinkStreams } from "./chainlink"

let isInitialized = false
let isInitializing = false

/**
 * Initialise les services serveur (trading engine, Chainlink streams)
 * À appeler une seule fois au démarrage du serveur
 * L'initialisation est asynchrone et n'empêche pas le serveur de démarrer
 */
export async function initializeServer() {
  if (isInitialized || isInitializing) {
    return
  }

  isInitializing = true

  // Initialiser de manière asynchrone sans bloquer le démarrage du serveur
  // Utiliser Promise.resolve().then() pour différer l'exécution
  Promise.resolve().then(async () => {
    try {
      // Initialiser Chainlink Data Streams (pour les prix en temps réel)
      // Cette opération est non-bloquante
      const chainlinkStreams = getChainlinkStreams()
      chainlinkStreams.connect()

      // Initialiser le trading engine (charge les stratégies actives et s'abonne aux prix)
      // On catch les erreurs pour ne pas bloquer le serveur
      try {
        await tradingEngine.initialize()
      } catch (error) {
        // Log silencieux en développement pour ne pas polluer la console
        if (process.env.NODE_ENV !== 'development') {
          console.error("Error initializing trading engine (non-fatal):", error)
        }
        // Continuer même si le trading engine échoue
      }

      isInitialized = true
      isInitializing = false
    } catch (error) {
      // Log silencieux en développement
      if (process.env.NODE_ENV !== 'development') {
        console.error("Error initializing server (non-fatal):", error)
      }
      isInitializing = false
      // Ne pas bloquer le démarrage en cas d'erreur
    }
  }).catch(() => {
    // Ignorer les erreurs pour ne pas bloquer
    isInitializing = false
  })

  // Retourner immédiatement pour ne pas bloquer
  return Promise.resolve()
}

/**
 * Vérifie si les services sont initialisés
 */
export function isServerInitialized(): boolean {
  return isInitialized
}

