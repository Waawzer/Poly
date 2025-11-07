// Intercepter les logs de requêtes HTTP avant de démarrer Next.js
const { spawn } = require('child_process')

// Fonction pour filtrer les logs
function filterLogs(data) {
  try {
    const message = typeof data === 'string' ? data : data.toString()
    
    // Filtrer les logs de requêtes HTTP de Next.js (format: "GET /api/... 200 in XXXms")
    if (
      message.includes('GET /api/') ||
      message.includes('POST /api/') ||
      message.includes('PUT /api/') ||
      message.includes('DELETE /api/') ||
      message.includes('PATCH /api/')
    ) {
      return false // Ne pas afficher ce log
    }
    
    // Vérifier le pattern regex uniquement si c'est une string valide
    if (typeof message === 'string' && message.trim().length > 0) {
      const httpLogRegex = /^\s*(GET|POST|PUT|DELETE|PATCH)\s+\/api\/.*\s+\d+\s+in\s+\d+ms\s*$/m
      if (httpLogRegex && typeof httpLogRegex.test === 'function') {
        if (httpLogRegex.test(message)) {
          return false // Ne pas afficher ce log
        }
      }
    }
    
    return true // Afficher ce log
  } catch (error) {
    // En cas d'erreur, afficher le log par défaut
    return true
  }
}

// Démarrer Next.js avec interception des logs
const nextDev = spawn('next', ['dev'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: {
    ...process.env,
  },
})

// Intercepter stdout
nextDev.stdout.on('data', (data) => {
  if (filterLogs(data)) {
    process.stdout.write(data)
  }
})

// Intercepter stderr
nextDev.stderr.on('data', (data) => {
  if (filterLogs(data)) {
    process.stderr.write(data)
  }
})

nextDev.on('close', (code) => {
  process.exit(code)
})

nextDev.on('error', (error) => {
  console.error('Error starting Next.js:', error)
  process.exit(1)
})

// Gérer les signaux de terminaison
process.on('SIGINT', () => {
  nextDev.kill('SIGINT')
})

process.on('SIGTERM', () => {
  nextDev.kill('SIGTERM')
})
