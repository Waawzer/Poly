# Guide de prévisualisation

## Prérequis

1. **Créer le fichier `.env.local`** à la racine du projet avec au minimum :

```env
# MongoDB (optionnel pour la prévisualisation de base)
MONGODB_URI=mongodb://localhost:27017/poly-trading

# Redis (optionnel pour la prévisualisation de base)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Safe Wallet
NEXT_PUBLIC_SAFE_APP_URL=http://localhost:3000

# Chainlink Data Streams
CHAINLINK_DATA_STREAMS_WS_URL=wss://data-streams.chain.link

# Polymarket CLOB API
POLYMARKET_CLOB_API_URL=https://clob.polymarket.com

# Polygon RPC
POLYGON_RPC_URL=

# Cron secret
CRON_SECRET=dev-secret-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Démarrer le serveur de développement

Pour prévisualiser le site localement, vous avez plusieurs options :

### Option 1 : Via la commande npm

```bash
npm run dev
```

Le site sera accessible sur : **http://localhost:3000**

### Option 2 : Si un serveur tourne déjà

Si vous avez déjà un serveur Next.js qui tourne (peut-être sur un autre port), vous pouvez :

1. Vérifier les ports utilisés :
   ```bash
   netstat -ano | findstr :3000
   ```

2. Accéder directement à l'URL du serveur dans votre navigateur

## Notes importantes

- **Sans MongoDB** : L'authentification et la sauvegarde des données ne fonctionneront pas, mais vous pouvez voir l'interface
- **Sans Redis** : Le cache des prix ne fonctionnera pas, mais l'interface s'affichera
- **Sans Safe Wallet** : Vous verrez la page de connexion, mais ne pourrez pas vous connecter

## Dépannage

Si le port 3000 est déjà utilisé, Next.js vous proposera automatiquement d'utiliser un autre port (3001, 3002, etc.)

Pour forcer un port spécifique :
```bash
npm run dev -- -p 3001
```

