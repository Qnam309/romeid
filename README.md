# RomeID — Identity Manager for ROME Arena

A complete **locally runnable MVP** for the official Arena *Identity Manager* idea: users prove control of an EVM wallet and a Solana wallet by signing the **same one-time challenge**, then publish an off-chain verified wallet pairing. Includes an optional Solidity on-chain attestation contract.

## What works now
- Connect MetaMask (EVM) and Phantom (Solana)
- Server-generated 5-minute one-time challenge, bound to app origin, wallet addresses and expiry
- EIP-191 EVM signature verification (`ethers.verifyMessage`)
- Ed25519 Solana signature verification (`tweetnacl`)
- Prevent linking the same Solana wallet to two EVM profiles; persist verified records to local JSON
- Public search by EVM address; proof digest; responsive frontend
- Contract source for future Hadrian on-chain anchoring

**Important:** This version is an off-chain signature-verification MVP. The contract is NOT automatically deployed or called. It would be misleading to claim an on-chain verified identity or a completed Rome-native dual-lane integration. This project is not yet submission-ready for Rome's on-chain requirements. A second integration phase is necessary.

## Requirements
- Node.js 20.19+ or 22+
- npm
- MetaMask extension + Phantom extension in a compatible browser

## Run in VS Code
1. Extract ZIP and open the `romeid` folder in VS Code.
2. In terminal: `npm install`
3. Copy `.env.example` to `.env` (Windows PowerShell: `Copy-Item .env.example .env`)
4. Terminal A: `npm run server`
5. Terminal B: `npm run dev`
6. Open `http://localhost:5173`
7. Connect both wallets, approve both **message signatures**, then verify a profile with its EVM address.
8. `npm test` tests cryptographic verification; `npm run build` builds the frontend.

## Deploy notes
- Frontend: Vercel (`npm run build`, output `dist`).
- API: must run on a persistent Node host with persistent storage; Vercel static hosting alone will NOT run the Express API. Set `VITE_API_URL` to the public API base URL at frontend build time and `APP_ORIGIN` on the API to the frontend's exact origin.
- The JSON file store is for local development only. Use a transactional database (e.g. Postgres) before public launch. Add rate limiting, durable nonce storage, auth for revocations and audit logs.
- Never commit private keys, `.env`, mnemonic phrases, or wallet secrets. Neither wallet needs a private key in this application.
- On-chain attestation: deploy `contracts/RomeIDRegistry.sol` on Hadrian using the official ROME CLI/Hardhat, then add an **authorized backend attestor** that validates signatures and submits `attest`. Build an explicit consent-based unlink/revoke flow. Verify chain ID, RPC and gas token against live ROME registry before deployment.
- No automated on-chain transactions are performed by this MVP.

## Suggested Arena description
**App:** RomeID
**One line:** One identity, two wallets. Link EVM and Solana wallets through verified ownership.
**Type:** Both (target architecture; MVP wallet signing is supported, but on-chain integration is pending).

## Security considerations
- Signature text is plain text and includes the app origin, both addresses, nonce, expiry and exact intent. Do not sign unexpected wallet prompts.
- Server challenges are single-use but stored in memory; restart invalidates them. API is not hardened for public production use.
- Local JSON storage is not concurrency-safe. This is a demonstrator, not a production identity authority.
- Public profiles reveal that two addresses belong to the same person; only link wallets you intend to associate publicly.
- The contract trusts its attestor; it does not verify Solana Ed25519 signatures by itself.

## Source reference
Designed against the user-provided `ROME_and_Arena_Knowledge_Base.md` (snapshot 2026-11-04). Chain facts must be checked live before deployment.


## V2: Fastest Hadrian on-chain path (testnet)

This V2 retains the working off-chain MetaMask+Phantom signature verification. It can **optionally** submit an attestation to the Hadrian testnet automatically after successful dual-signature verification. The contract trusts the server attestor; it does not verify Solana Ed25519 signatures on-chain. The API must stay online to verify new users.

1. Copy `.env.example` to `.env` and create a **new dedicated test-only EVM wallet** for anchoring. Never use your main wallet or share the private key. Set `ANCHOR_PRIVATE_KEY` in local `.env` (never commit).
2. Verify Hadrian RPC, chain ID and faucet instructions against current Rome docs/registry. Fund the dedicated attestor wallet with enough Hadrian **test gas token**. The test gas token may be USDC, not ETH.
3. Run `npm install`, then `npm run deploy:hadrian`. This compiles and deploys `RomeIDRegistry` with the attestor wallet as owner. Record the contract address and deployment transaction.
4. Set `ANCHOR_CONTRACT_ADDRESS` in `.env`. Run `npm run server` and `npm run dev` in separate terminals.
5. Reconnect both wallets and click **Verify & Link** again. The API verifies both signatures, then uses the **server's dedicated attestor wallet** to send an on-chain transaction. Check the transaction hash on the Hadrian explorer.
6. Test Public Registry search. If the RPC, faucet or contract execution fails, the UI will accurately report the link as **off-chain only**.

**Security:** Never place private keys in `VITE_` environment variables or GitHub. `.env` is gitignored. For production use, move from a trusted centralized attestor to a more robust permissioned proof architecture and persistent database. This project is an MVP, not audited.

**Deployment:** Vercel can host the Vite frontend, but the Express API and server attestor need a separate Node hosting service with secure environment variables. Vercel frontend alone does not make the full app work. Arena registration/Laurels are subject to the current program rules; a working testnet transaction does not guarantee a reward.
