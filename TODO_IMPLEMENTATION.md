# Ce qui reste à implémenter pour qu'un utilisateur puisse utiliser une stratégie

## ✅ DÉJÀ FONCTIONNEL

1. ✅ Connexion wallet (MetaMask, Rabby, Safe Wallet)
2. ✅ Création et sauvegarde de stratégies en MongoDB
3. ✅ Affichage des stratégies avec stats (ordres, PnL)
4. ✅ Prix en temps réel via Chainlink Data Streams
5. ✅ Moteur de trading qui évalue les stratégies
6. ✅ Builder code intégré pour signer les ordres
7. ✅ Route API pour signer les requêtes (`/api/builder/sign`)

## 🔴 CRITIQUE - À IMPLÉMENTER

### 1. Initialisation automatique du trading engine ⚠️

**Status**: ✅ Code créé, ⚠️ À tester

**Fichiers créés**:
- `src/instrumentation.ts` - Hook Next.js pour initialiser au démarrage
- `src/lib/server-init.ts` - Module d'initialisation serveur
- `next.config.js` - Ajouté `instrumentationHook: true`

**À faire**: 
- Redémarrer le serveur et vérifier que le trading engine s'initialise automatiquement
- Vérifier dans les logs que Chainlink et le trading engine démarrent

---

### 2. Récupération des marchés Polymarket 🔴

**Problème**: La fonction `getMarket()` utilise un endpoint qui n'existe probablement pas (`/markets/{slug}`).

**À implémenter**:
1. Utiliser l'API Polymarket ou le Subgraph pour récupérer les marchés
2. Les marchés 15m pour BTC/ETH/XRP/SOL doivent être identifiés par :
   - Condition ID (si les marchés existent déjà)
   - Ou créer les marchés dynamiquement
   - Ou utiliser le Subgraph Polymarket (The Graph)

**Fichier à modifier**: `src/lib/polymarket.ts` - méthode `getMarket()`

**Solution possible**:
- Utiliser `ClobClient.getMarkets()` si disponible
- Ou interroger le Subgraph Polymarket: `https://api.thegraph.com/subgraphs/name/polymarket/polymarket`
- Ou utiliser l'API Polymarket publique

---

### 3. Gestion des allowances 🔴

**Problème**: Les utilisateurs doivent approuver les allowances manuellement avant de pouvoir trader. Actuellement, si l'allowance est insuffisante, le trade échoue.

**À implémenter**:

#### A. Interface UI pour approuver les allowances

**Fichier à créer**: `src/components/AllowanceApproval.tsx`

**Fonctionnalités**:
- Afficher l'état des allowances pour chaque stratégie
- Bouton "Approve Allowance" pour chaque stratégie
- Vérifier l'allowance avant d'activer une stratégie
- Afficher un warning si l'allowance est insuffisante

#### B. Composant client pour approuver

**Fichier à créer**: `src/components/ApproveAllowanceButton.tsx`

**Fonctionnalités**:
- Utiliser wagmi/ethers pour signer la transaction
- Appeler `polymarketBuilder.approveAllowance()` ou `ClobClient.approveAllowance()`
- Afficher le statut de la transaction (pending, success, error)
- Mettre à jour l'UI après approbation

**Code nécessaire**:
```typescript
// Utiliser wagmi pour obtenir le signer
import { useAccount, useWalletClient } from 'wagmi'

// Appeler approveAllowance avec le signer du wallet connecté
const { data: walletClient } = useWalletClient()
const signer = walletClient ? await walletClient.getSigner() : null
await polymarketBuilder.approveAllowance(walletAddress, tokenId, amount, signer)
```

#### C. Intégration dans le Dashboard

**Fichier à modifier**: `src/components/StrategiesTable.tsx`

**À ajouter**:
- Colonne "Allowance" qui affiche l'état
- Bouton "Approve" si allowance insuffisante
- Vérifier l'allowance avant d'activer une stratégie

---

### 4. Vérification de l'existence des marchés 🟡

**À implémenter**: Vérifier que les marchés Polymarket existent avant d'activer une stratégie.

**Fichier à modifier**: `src/components/StrategyForm.tsx` ou créer `src/components/MarketValidation.tsx`

**Fonctionnalités**:
- Vérifier l'existence du marché lors de la création de stratégie
- Afficher un warning si le marché n'existe pas
- Optionnel: Créer le marché si nécessaire (si API Polymarket le permet)

---

### 5. Gestion des erreurs et notifications 🟡

**À implémenter**: Informer l'utilisateur quand un ordre est exécuté ou échoue.

**Fichier à créer**: `src/components/TradeNotifications.tsx`

**Fonctionnalités**:
- Toast notifications pour les ordres exécutés
- Alertes pour les erreurs (allowance insuffisante, marché introuvable, etc.)
- Historique des trades récents

---

## 📋 Checklist complète pour qu'un utilisateur puisse utiliser une stratégie

### Étape 1: Connexion et création ✅
- [x] 1.1. Utilisateur se connecte avec son wallet
- [x] 1.2. Utilisateur crée une stratégie
- [x] 1.3. Stratégie est sauvegardée en base de données

### Étape 2: Initialisation ⚠️
- [x] 2.1. Code d'initialisation créé
- [ ] 2.2. **Vérifier que le trading engine démarre automatiquement** ⚠️

### Étape 3: Marchés Polymarket 🔴
- [ ] 3.1. **Implémenter la récupération correcte des marchés** 🔴
- [ ] 3.2. **Vérifier que les marchés existent pour les bougies 15m** 🔴
- [ ] 3.3. Gérer les cas où le marché n'existe pas

### Étape 4: Allowances 🔴
- [ ] 4.1. **Créer l'interface UI pour approuver les allowances** 🔴
- [ ] 4.2. **Implémenter l'approbation depuis le wallet de l'utilisateur** 🔴
- [ ] 4.3. Vérifier l'allowance avant d'activer une stratégie
- [ ] 4.4. Afficher l'état des allowances dans l'UI

### Étape 5: Exécution ⚠️
- [x] 5.1. Trading engine surveille les stratégies actives
- [x] 5.2. Quand les conditions sont remplies, un ordre est créé
- [ ] 5.3. **Vérifier que l'ordre est exécuté avec succès** ⚠️ (dépend des points précédents)
- [ ] 5.4. Notifier l'utilisateur de l'exécution

---

## 🚀 Prochaines étapes (par ordre de priorité)

### Priorité 1: 🔴 CRITIQUE
1. **Tester l'initialisation automatique** du trading engine
2. **Implémenter la récupération correcte des marchés** Polymarket
3. **Créer l'interface UI pour approuver les allowances**

### Priorité 2: 🟡 IMPORTANT
4. Vérifier l'existence des marchés avant activation
5. Ajouter des notifications pour les ordres exécutés
6. Gérer les erreurs et afficher des messages clairs

### Priorité 3: 📝 AMÉLIORATION
7. Optimiser les performances
8. Ajouter plus de statistiques
9. Améliorer l'UX

---

## 📝 Notes importantes

### Allowances
- Les allowances **ne peuvent pas être approuvées automatiquement** sans la signature de l'utilisateur
- L'utilisateur **doit approuver manuellement** via son wallet (MetaMask, Rabby, etc.)
- L'approbation nécessite une transaction on-chain (gas fees)

### Marchés Polymarket
- Les marchés 15m peuvent ne pas exister automatiquement
- Il faut soit :
  - Les créer dynamiquement (si API le permet)
  - Utiliser des marchés existants avec condition ID
  - Ou attendre qu'ils soient créés par Polymarket

### Builder Code
- Le builder code signe automatiquement les ordres ✅
- Mais les allowances doivent être approuvées par l'utilisateur 🔴
- Les ordres sont associés à votre builder code automatiquement ✅

