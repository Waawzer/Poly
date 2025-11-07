# État d'implémentation - Poly Trading Bot

## ✅ Ce qui est déjà implémenté

### 1. Authentification et connexion wallet
- ✅ Connexion avec MetaMask, Rabby, WalletConnect (RainbowKit)
- ✅ Connexion avec Safe Wallet
- ✅ Création automatique d'utilisateur et wallet en base de données

### 2. Création et gestion des stratégies
- ✅ Formulaire de création de stratégie
- ✅ Sauvegarde en MongoDB
- ✅ Affichage des stratégies avec stats (ordres, PnL)
- ✅ Activation/désactivation de stratégies
- ✅ Suppression de stratégies

### 3. Prix en temps réel
- ✅ Intégration Chainlink Data Streams (WebSocket)
- ✅ Affichage des prix live et des prix d'ouverture de bougies 15m
- ✅ Cache Redis pour les prix

### 4. Moteur de trading
- ✅ Évaluation automatique des stratégies basée sur les prix
- ✅ Vérification des conditions (fenêtre de trading, threshold, direction)
- ✅ Logique d'exécution des trades

### 5. Builder code et signatures
- ✅ Intégration `@polymarket/clob-client` avec builder signing
- ✅ Route API pour signer les requêtes (`/api/builder/sign`)
- ✅ Configuration builder code avec credentials

## ⚠️ Ce qui manque (CRITIQUE)

### 1. 🔴 Initialisation automatique du trading engine
**Problème**: Le trading engine n'est pas initialisé automatiquement au démarrage du serveur.

**Solution**: 
- ✅ Créé `src/lib/server-init.ts` et `src/instrumentation.ts`
- ✅ Ajouté `instrumentationHook: true` dans `next.config.js`
- ⚠️ **À tester**: Vérifier que le trading engine démarre automatiquement

### 2. 🔴 Récupération des marchés Polymarket
**Problème**: La fonction `getMarket()` utilise un endpoint qui n'existe probablement pas (`/markets/{slug}`).

**À implémenter**:
- Utiliser l'API Polymarket ou le Subgraph pour récupérer les marchés
- Les marchés 15m pour BTC/ETH/XRP/SOL doivent être récupérés via :
  - Soit l'API Polymarket publique
  - Soit le Subgraph Polymarket (The Graph)
  - Soit via `ClobClient.getMarket()` si disponible

### 3. 🔴 Gestion des allowances
**Problème**: Les utilisateurs doivent approuver les allowances manuellement avant de pouvoir trader.

**À implémenter**:
1. **Interface UI** pour approuver les allowances :
   - Bouton "Approve Allowance" dans le Dashboard
   - Afficher l'état des allowances pour chaque stratégie
   - Demander l'approbation avant d'activer une stratégie

2. **Route API pour approuver** (`/api/wallets/[id]/approve-allowance`):
   - Utiliser le wallet de l'utilisateur pour signer la transaction
   - Appeler `approve()` sur le contrat USDC/ConditionalTokens
   - Gérer les erreurs et les confirmations

### 4. 🟡 Vérification de l'existence des marchés
**Problème**: On ne vérifie pas si les marchés Polymarket existent vraiment pour les bougies 15m.

**À implémenter**:
- Vérifier que les marchés existent avant d'activer une stratégie
- Afficher un avertissement si le marché n'existe pas
- Gérer les cas où le marché n'est pas encore créé

## 📝 Checklist pour qu'un utilisateur puisse utiliser une stratégie

- [x] 1. Utilisateur se connecte avec son wallet
- [x] 2. Utilisateur crée une stratégie
- [x] 3. Stratégie est sauvegardée en base de données
- [ ] 4. **Trading engine est initialisé automatiquement** (⚠️ À vérifier)
- [ ] 5. **Marché Polymarket existe pour la bougie 15m** (🔴 À implémenter)
- [ ] 6. **Utilisateur approuve les allowances** (🔴 À implémenter)
- [x] 7. Stratégie est activée et surveillée par le trading engine
- [x] 8. Quand les conditions sont remplies, un ordre est placé
- [ ] 9. **Ordre est exécuté avec succès** (⚠️ Dépend des points précédents)

## 🚀 Prochaines étapes prioritaires

1. **Vérifier l'initialisation automatique** du trading engine
2. **Implémenter la récupération correcte des marchés** Polymarket
3. **Créer l'interface UI pour approuver les allowances**
4. **Tester avec un ordre réel** sur testnet/mainnet

