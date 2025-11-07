# Poly Trading Bot

Bot de trading automatisé pour Polymarket (marchés de prédiction) exécutant des stratégies basées sur le timing et la différence de prix sur des marchés cryptos 15 minutes.

## Fonctionnalités

- **Trading multi-marchés** : Support de 4 cryptos (BTC, ETH, XRP, SOL)
- **Stratégies basées sur le timing** : Trading sur bougies 15 minutes avec fenêtres configurables
- **Prix en temps réel** : Chainlink Data Streams via WebSocket
- **Interface utilisateur** : Dashboard avec prix en temps réel, gestion des stratégies
- **Gestion des wallets** : Multi-wallets via Safe Wallet (Polymarket Builders)
- **Redeem automatique** : Toutes les heures à :00

## Stack technique

- **Frontend** : Next.js 14+ App Router, TypeScript, Tailwind CSS
- **Backend** : Next.js API Routes
- **Base de données** : MongoDB (Mongoose)
- **Cache** : Redis (Upstash)
- **Authentification** : Safe Wallet SDK
- **Intégrations** : Chainlink Data Streams, Polymarket CLOB API

## Installation

### Prérequis

- Node.js 18+
- MongoDB (local ou Atlas)
- Compte Upstash pour Redis
- Safe Wallet (Polymarket Builders)

### Configuration

1. Clonez le projet et installez les dépendances :

```bash
npm install
```

2. Créez un fichier `.env.local` à la racine du projet :

**Option 1**: Copiez le fichier d'exemple :
```bash
cp .env.local.example .env.local
```

**Option 2**: Créez le fichier manuellement avec les variables suivantes :

```env
# MongoDB
# Format: mongodb://[username:password@]host[:port]/[database]
# Le nom de la base de données est spécifié après le dernier "/"
# Exemple pour base de données locale "poly":
MONGODB_URI=mongodb://localhost:27017/poly
# Exemple pour MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/poly
# 
# Note: Mongoose créera automatiquement les collections suivantes dans la base "poly":
# - users (pour les utilisateurs)
# - wallets (pour les wallets)
# - strategies (pour les stratégies)
# - trades (pour les trades)
# - pricehistories (pour l'historique des prix)

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=votre_url_upstash
UPSTASH_REDIS_REST_TOKEN=votre_token_upstash

# Safe Wallet
NEXT_PUBLIC_SAFE_APP_URL=http://localhost:3000

# WalletConnect (for wallet connection)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Chainlink Data Streams (Testnet)
CHAINLINK_DATA_STREAMS_WS_URL=wss://testnet.data-streams.chain.link
CHAINLINK_USER_ID=f951f6a3-e409-4299-9c0a-b6e5d17b0719
CHAINLINK_USER_SECRET=F4NFc7Y11dGZngzd0h3hjY8oCI3AlFn46l1z2x5tus2sU3AybS0Ec4GgX6uO2UGT1gcvGxnPeU1A4aq6qn80OX2dblNu5z7y1WU7VUvQtXuict7cF95E57xP2ootqXz7

# Polymarket CLOB API
POLYMARKET_CLOB_API_URL=https://clob.polymarket.com
POLYMARKET_CLOB_HOST=https://clob.polymarket.com

# Polymarket Subgraph
POLYMARKET_SUBGRAPH_URL=https://api.thegraph.com/subgraphs/name/polymarket/matic

# Polygon RPC
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/DLlqUGOc0rPpeirsm_ZcjfS4TascPvKT
POLYGON_CHAIN_ID=137

# Polymarket Contract Addresses
NEXT_PUBLIC_CONDITIONAL_TOKENS_ADDRESS=0x4D97DCd97eC945f40cF65F87097ACe5EA0476045
NEXT_PUBLIC_USDC_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
NEXT_PUBLIC_POLYMARKET_EXCHANGE_ADDRESS=0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E
NEXT_PUBLIC_CTF_EXCHANGE_ADDRESS=0xC5d563A36AE78145C45a50134d48A1215220f80a
NEXT_PUBLIC_NEG_RISK_CTF_EXCHANGE_ADDRESS=0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296

# Polymarket Builder Code (pour l'exécution automatique des ordres)
POLY_BUILDER_API_KEY=votre_builder_api_key
POLY_BUILDER_SECRET=votre_builder_secret
POLY_BUILDER_PASSPHRASE=votre_builder_passphrase

# Builder Sign URL (URL de l'API de signature builder)
NEXT_PUBLIC_BUILDER_SIGN_URL=http://localhost:3000/api/builder/sign

# Cron secret (pour sécuriser les routes cron)
CRON_SECRET=votre_secret_cron

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

3. Démarrez le serveur de développement :

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Structure du projet

```
src/
├── app/              # Pages Next.js App Router
│   ├── api/          # API Routes
│   │   ├── auth/     # Authentification
│   │   ├── wallets/  # Gestion des wallets
│   │   ├── strategies/ # Gestion des stratégies
│   │   ├── prices/   # Prix en temps réel
│   │   ├── trades/   # Historique des trades
│   │   └── cron/     # Cron jobs (trading, redeem)
│   └── page.tsx      # Page principale (Dashboard)
├── components/       # Composants React
│   ├── ui/          # Composants UI de base
│   ├── PriceDisplay.tsx
│   ├── StrategyForm.tsx
│   └── StrategiesTable.tsx
├── lib/             # Utilitaires et intégrations
│   ├── mongodb.ts   # Configuration MongoDB
│   ├── redis.ts     # Configuration Redis
│   ├── chainlink.ts # Intégration Chainlink Data Streams
│   ├── polymarket.ts # Intégration Polymarket CLOB API
│   ├── safe-wallet.ts # Intégration Safe Wallet
│   ├── trading-engine.ts # Moteur de trading
│   └── utils.ts     # Utilitaires
├── models/          # Modèles Mongoose
│   ├── User.ts
│   ├── Wallet.ts
│   ├── Strategy.ts
│   ├── Trade.ts
│   └── PriceHistory.ts
├── store/           # Store Zustand
│   └── useStore.ts
└── types/           # Types TypeScript
    └── index.ts
```

## Modèle de données

### Users
- `safeWalletAddress` : Adresse du Safe Wallet

### Wallets
- `userId` : Référence à l'utilisateur
- `name` : Nom du wallet
- `address` : Adresse du wallet
- `safeWalletAddress` : Adresse du Safe Wallet
- `allowanceEnabled` : Statut d'approbation des tokens

### Strategies
- `userId` : Référence à l'utilisateur
- `walletId` : Référence au wallet
- `crypto` : Crypto (BTC, ETH, XRP, SOL)
- `priceThreshold` : Seuil en USD
- `orderPrice` : Prix de l'ordre (0-1)
- `orderAmount` : Quantité
- `tradingWindowStart` : Début de la fenêtre (0-14 min)
- `tradingWindowEnd` : Fin de la fenêtre (0-14 min)
- `enabled` : Statut actif/inactif

### Trades
- `strategyId` : Référence à la stratégie
- `marketId` : ID du marché Polymarket
- `side` : UP ou DOWN
- `price` : Prix d'exécution
- `size` : Taille
- `status` : Statut du trade
- `executedAt` : Date d'exécution

### PriceHistory
- `crypto` : Crypto
- `price` : Prix
- `timestamp` : Timestamp

## Utilisation

1. **Connexion** : Connectez-vous avec Safe Wallet
2. **Ajout de wallet** : Ajoutez un wallet depuis l'interface
3. **Création de stratégie** : Créez une stratégie avec les paramètres souhaités
4. **Monitoring** : Surveillez les prix en temps réel et les stratégies actives

## Déploiement sur Vercel

1. Poussez votre code sur GitHub
2. Connectez votre dépôt à Vercel
3. Configurez les variables d'environnement dans Vercel
4. Déployez

Les cron jobs sont configurés dans `vercel.json` :
- Trading engine : Toutes les 5 minutes
- Redeem automatique : Toutes les heures à :00

## Notes importantes

- Les formats WebSocket Chainlink Data Streams doivent être adaptés selon la documentation officielle
- L'API Polymarket CLOB nécessite des signatures de messages avec Safe Wallet
- Les adresses de tokens USDC et les contrats doivent être vérifiées pour le réseau Polygon
- Le redeem automatique nécessite une implémentation complète de l'API Polymarket

## Licence

MIT

