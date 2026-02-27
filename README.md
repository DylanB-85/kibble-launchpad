# Kibble (KBL) Launchpad

Token launchpad for Kibble (KBL) — built on OPNet, deployed to a `.btc` domain.

## Setup

```bash
npm install
npm run dev       # local dev at http://localhost:3000
npm run build     # production build → dist/
```

## Before Going Live

1. Deploy your `Kibble.wasm` contract using OP_WALLET
2. Copy the deployed contract address
3. Open `app.js` and replace:
   ```js
   const KBL_CONTRACT_ADDRESS = 'PASTE_YOUR_CONTRACT_ADDRESS_HERE';
   ```
   with your actual address, e.g.:
   ```js
   const KBL_CONTRACT_ADDRESS = '0xabc123...';
   ```
4. Rebuild: `npm run build`

## Deploy to a .btc Domain

Once built, deploy to OPNet using the CLI:

```bash
# Upload dist/ to IPFS and publish to your .btc domain
bash /root/opnet-cli/scripts/ipfs-upload.sh ./dist kibble
```

This publishes to `kibble.btc` and makes your launchpad accessible via the OPNet gateway.

## Features

- OP_WALLET connection
- Live KBL circulating supply from contract
- Live holder balance after connecting
- BTC → KBL swap via NativeSwap
- Scroll-reveal animations
- Fully responsive (mobile / tablet / desktop)
