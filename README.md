# DailyDrop 🔥

> Check in daily on-chain. 7-day streak = 10 DROP tokens.

**Compatible MiniPay ✅ | Compatible Farcaster Frames ✅ | Celo + Base ✅**

## Démo

🔗 App live : https://dailydrop-five.vercel.app
🐙 GitHub : https://github.com/wkalidev/dailydrop
🪙 Contrat Celo : `0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b`
🪙 Contrat Base : `0x974fB504172f2aABbecc698Ebf137202a5E4e495`

---

## Comment ça marche

1. Connecte ton wallet (MetaMask, MiniPay, Rabby…)
2. Clique **Check-in** une fois par jour
3. Construis un streak de 7 jours d'affilée
4. Claim **10 DROP tokens** 🎁
5. Recommence !

---

## Stack

| Layer | Tech |
|---|---|
| Smart Contract | Solidity 0.8.20, OpenZeppelin ERC20 |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Web3 | wagmi v2, viem, RainbowKit |
| Frames | Farcaster Frames vNext |
| Déploiement | Vercel (frontend), Hardhat (contracts) |
| Chains | Celo Mainnet (42220) + Base Mainnet (8453) |

---

## Installation

### 1. Cloner le repo

```bash
git clone https://github.com/wkalidev/dailydrop
cd dailydrop
```

### 2. Installer les dépendances des contrats

```bash
npm install
```

### 3. Installer les dépendances du frontend

```bash
cd frontend
npm install
cd ..
```

### 4. Configurer les variables d'environnement

```bash
cp frontend/.env.example frontend/.env.local
```

Remplis `.env.local` avec :
- `PRIVATE_KEY` : ta clé privée (pour déployer)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` : obtenir sur https://cloud.walletconnect.com
- `NEXT_PUBLIC_CDP_PROJECT_ID` : obtenir sur https://portal.cdp.coinbase.com

---

## Déploiement des contrats

### Compiler

```bash
npm run compile
```

### Déployer sur Celo Mainnet ✅

```bash
npm run deploy:celo
```

### Déployer sur Base Mainnet ✅

```bash
npm run deploy:base
```

> Les adresses sont automatiquement sauvegardées dans `deployments.json` et `frontend/.env.local`

---

## Lancer le frontend

```bash
cd frontend
npm run dev
```

Ouvre http://localhost:3000

---

## Déployer sur Vercel

1. Push sur GitHub
2. Connecte à Vercel : https://vercel.com/new
3. Sélectionne le repo `wkalidev/dailydrop`
4. Root Directory → `frontend`
5. Configure les variables d'environnement :

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Reown/WalletConnect project ID |
| `NEXT_PUBLIC_CDP_PROJECT_ID` | Coinbase Developer Platform project ID |
| `NEXT_PUBLIC_CELO_CONTRACT_ADDRESS` | Adresse contrat Celo mainnet |
| `NEXT_PUBLIC_BASE_CONTRACT_ADDRESS` | Adresse contrat Base mainnet |
| `NEXT_PUBLIC_APP_URL` | URL de l'app déployée |

6. Deploy !

---

## MiniPay

L'app détecte automatiquement MiniPay via `window.ethereum.isMiniPay`.
Si MiniPay est détecté :
- Connexion wallet automatique
- Badge "✅ MiniPay" affiché
- Interface optimisée mobile

Pour tester dans MiniPay :
1. Télécharge MiniPay sur Android
2. Active le mode développeur dans les paramètres
3. Entre l'URL : https://dailydrop-five.vercel.app

---

## Farcaster Frame

Le Frame est disponible à `/api/frame`.
Il permet aux utilisateurs Farcaster de voir leur streak et d'ouvrir l'app directement depuis Warpcast.

Pour tester : https://warpcast.com/~/developers/frames

URL du frame : https://dailydrop-five.vercel.app/api/frame

---

## Structure du projet

```
dailydrop/
├── contracts/
│   └── DailyDrop.sol          # Smart contract ERC20 + check-in
├── deploy/
│   └── deploy.ts              # Script de déploiement
├── hardhat.config.ts          # Config Hardhat (Celo + Base)
├── package.json               # Dépendances contrats
├── deployments.json           # Adresses déployées (auto-généré)
└── frontend/
    ├── app/
    │   ├── page.tsx           # Page principale
    │   ├── layout.tsx         # Layout + metadata Farcaster
    │   ├── providers.tsx      # wagmi + RainbowKit providers
    │   ├── globals.css        # Design system complet
    │   └── api/frame/
    │       └── route.ts       # Farcaster Frame endpoint
    ├── components/
    │   ├── CheckInButton.tsx  # Bouton check-in + claim
    │   ├── StreakDisplay.tsx  # Affichage streak + stats
    │   └── MiniPayDetector.tsx # Auto-connect MiniPay
    ├── lib/
    │   ├── wagmi.ts           # Config wagmi
    │   └── contract.ts        # ABI + adresses
    └── .env.example           # Variables d'environnement
```

---

## Contrats déployés

| Network | Adresse |
|---|---|
| Celo Mainnet | `0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b` |
| Base Mainnet | `0x974fB504172f2aABbecc698Ebf137202a5E4e495` |

Vérifier sur :
- Celo : https://celoscan.io/address/0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b
- Base : https://basescan.org/address/0x974fB504172f2aABbecc698Ebf137202a5E4e495

---

## Proof of Ship — Celo (Avril 2026)

Ce projet participe au programme **Celo Proof of Ship**.

- ✅ Build for MiniPay : hook `isMiniPay` détecté, connexion automatique
- ✅ Deploy on Celo Mainnet : contrat `0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b`
- ✅ Deploy on Base Mainnet : contrat `0x974fB504172f2aABbecc698Ebf137202a5E4e495`
- ✅ App live : https://dailydrop-five.vercel.app
- ✅ Farcaster Frame : https://dailydrop-five.vercel.app/api/frame

---

## Licence

MIT