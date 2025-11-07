# Résumé : Ce qui reste à implémenter

## ✅ CE QUI FONCTIONNE DÉJÀ

1. ✅ **Connexion wallet** - MetaMask, Rabby, Safe Wallet
2. ✅ **Création de stratégies** - Formulaire + sauvegarde MongoDB
3. ✅ **Affichage des stratégies** - Liste avec stats (ordres, PnL)
4. ✅ **Prix en temps réel** - Chainlink Data Streams opérationnel
5. ✅ **Moteur de trading** - Évalue automatiquement les stratégies
6. ✅ **Builder code** - Intégration pour signer les ordres automatiquement
7. ✅ **Signature automatique** - Route API `/api/builder/sign` fonctionne

## 🔴 CE QUI MANQUE (CRITIQUE)

### 1. Initialisation automatique du trading engine ⚠️

**Status**: ✅ Code créé (`src/instrumentation.ts`, `src/lib/server-init.ts`)

**À faire**: 
- Redémarrer le serveur et vérifier que le trading engine démarre automatiquement
- Vérifier dans les logs que Chainlink et le trading engine s'initialisent

**Comment tester**: 
```bash
npm run dev
# Vérifier les logs pour voir "Trading engine initialized" et "Chainlink connected"
```

---

### 2. Récupération des marchés Polymarket 🔴

**Problème**: La fonction `getMarket()` dans `src/lib/polymarket.ts` utilise un endpoint qui n'existe probablement pas (`/markets/{slug}`).

**À faire**:
1. Utiliser l'API Polymarket ou le Subgraph pour récupérer les vrais marchés
2. Les marchés 15m pour BTC/ETH/XRP/SOL doivent être identifiés par :
   - Condition ID (si les marchés existent)
   - Ou utiliser le Subgraph Polymarket (The Graph)
   - Ou utiliser `ClobClient.getMarkets()` si disponible

**Fichier à modifier**: `src/lib/polymarket.ts` - méthode `getMarket()`

**Options**:
- **Option 1**: Utiliser le Subgraph Polymarket
  ```typescript
  // Exemple: https://api.thegraph.com/subgraphs/name/polymarket/polymarket
  // Query pour trouver les marchés par condition ID ou slug
  ```

- **Option 2**: Utiliser ClobClient si disponible
  ```typescript
  // Si ClobClient a une méthode getMarkets() ou getMarket()
  const market = await clobClient.getMarket(conditionId)
  ```

- **Option 3**: Créer les marchés dynamiquement (si API le permet)

---

### 3. Gestion des allowances 🔴

**Problème**: Les utilisateurs doivent approuver les allowances manuellement avant de pouvoir trader. Actuellement, si l'allowance est insuffisante, le trade échoue.

**Status**: 
- ✅ Composant `ApproveAllowanceButton` créé
- ✅ Route API `/api/wallets/[id]/allowance` pour vérifier les allowances
- ⚠️ **À intégrer** dans `StrategiesTable.tsx`

**À faire**:

#### A. Intégrer le bouton d'approbation dans la table des stratégies

**Fichier à modifier**: `src/components/StrategiesTable.tsx`

**À ajouter**:
- Nouvelle colonne "Allowance" dans le tableau
- Utiliser `ApproveAllowanceButton` pour chaque stratégie
- Vérifier l'allowance avant d'activer une stratégie
- Afficher un warning si l'allowance est insuffisante

#### B. Obtenir le token ID pour chaque stratégie

**Problème**: Pour approuver l'allowance, on a besoin du token ID (YES ou NO).

**Solution**: 
- Quand une stratégie est créée, récupérer le marché correspondant
- Extraire le token ID (YES ou NO) selon le côté du trade
- Stocker le token ID dans la stratégie ou le récupérer à la volée

**À modifier**: 
- `src/models/Strategy.ts` - Optionnel: ajouter `tokenIdYes` et `tokenIdNo`
- `src/components/StrategiesTable.tsx` - Récupérer le token ID depuis le marché

#### C. Vérifier l'allowance avant d'activer une stratégie

**À faire**: 
- Dans `StrategyForm` ou `StrategiesTable`, vérifier l'allowance avant d'activer
- Afficher un message si l'allowance est insuffisante
- Proposer d'approuver l'allowance directement

---

### 4. Vérification de l'existence des marchés 🟡

**À faire**: 
- Vérifier que le marché existe avant d'activer une stratégie
- Afficher un warning si le marché n'existe pas
- Gérer les cas où le marché n'est pas encore créé

**Fichier à créer/modifier**: 
- `src/components/MarketValidation.tsx` (nouveau)
- `src/components/StrategyForm.tsx` (modifier pour valider le marché)

---

### 5. Notifications et feedback 🟡

**À faire**: 
- Notifier l'utilisateur quand un ordre est exécuté
- Afficher les erreurs (allowance insuffisante, marché introuvable, etc.)
- Historique des trades récents dans l'UI

**Fichier à créer**: 
- `src/components/TradeNotifications.tsx`

---

## 📋 CHECKLIST COMPLÈTE

### Pour qu'un utilisateur puisse utiliser une stratégie :

- [x] 1. Utilisateur se connecte avec son wallet
- [x] 2. Utilisateur crée une stratégie
- [x] 3. Stratégie est sauvegardée en base de données
- [ ] 4. **Trading engine est initialisé automatiquement** ⚠️ (À vérifier)
- [ ] 5. **Marché Polymarket existe pour la bougie 15m** 🔴 (À implémenter)
- [ ] 6. **Utilisateur approuve les allowances** 🔴 (Composant créé, à intégrer)
- [x] 7. Stratégie est activée et surveillée par le trading engine
- [x] 8. Quand les conditions sont remplies, un ordre est créé
- [ ] 9. **Ordre est exécuté avec succès** ⚠️ (Dépend des points précédents)

---

## 🚀 PROCHAINES ÉTAPES (par ordre de priorité)

### Priorité 1: 🔴 CRITIQUE
1. **Tester l'initialisation automatique** du trading engine
2. **Implémenter la récupération correcte des marchés** Polymarket
3. **Intégrer le bouton d'approbation d'allowance** dans `StrategiesTable.tsx`

### Priorité 2: 🟡 IMPORTANT
4. Vérifier l'existence des marchés avant activation
5. Ajouter des notifications pour les ordres exécutés
6. Gérer les erreurs et afficher des messages clairs

---

## 📝 NOTES IMPORTANTES

### Allowances
- ⚠️ Les allowances **ne peuvent pas être approuvées automatiquement** sans la signature de l'utilisateur
- ✅ L'utilisateur **doit approuver manuellement** via son wallet (MetaMask, Rabby, etc.)
- ✅ Le composant `ApproveAllowanceButton` gère cela côté client
- ✅ L'approbation nécessite une transaction on-chain (gas fees)

### Marchés Polymarket
- ⚠️ Les marchés 15m peuvent ne pas exister automatiquement
- Il faut soit :
  - Les créer dynamiquement (si API le permet)
  - Utiliser des marchés existants avec condition ID
  - Ou attendre qu'ils soient créés par Polymarket

### Builder Code
- ✅ Le builder code signe automatiquement les ordres
- ✅ Les ordres sont associés à votre builder code automatiquement
- ⚠️ Mais les allowances doivent être approuvées par l'utilisateur

