# Plan: PermissionedDEX Full Trading Flow

> Source PRD: https://github.com/florent-uzio/xrpl-pdex-sample/issues/1

## Architectural decisions

- **Network**: XRPL Testnet (`wss://s.altnet.rippletest.net:51233`)
- **Language**: TypeScript targeting Node.js, via npm
- **Dependency**: `xrpl` (latest stable)
- **Entry point**: `src/index.ts` — connects client, funds wallets, runs all phases in order, passes outputs as inputs
- **Accounts (6)**: Credential Issuer, Sender, Market Maker (MM), Domain Issuer, RLUSD Issuer, EUROF Issuer
- **Currencies**: RLUSD (IOU, trustline-based), EUROF (IOU, trustline-based) — no MPT
- **CredentialType**: hex-encoded `"EUROF_Approved"` via `convertStringToHex` — used in all credential and domain transactions
- **DomainID**: returned from Phase 4 (`03-domain.ts`), threaded into Phases 6 and 7 via `index.ts`
- **File structure**:
  ```
  src/
    config.ts
    utils.ts
    index.ts
    01-setup-accounts.ts
    02-credentials.ts
    03-domain.ts
    04-trustlines.ts
    05-mm-offers.ts
    06-sender-offer.ts
  ```

---

## Phase 1: Project Scaffolding

**User stories**: 15 (README prerequisites), 16 (centralized config), 17 (shared submit utility)

### What to build

Initialize the npm + TypeScript project and lay down the shared infrastructure all later phases depend on. By the end of this phase the project compiles and connects to Testnet — nothing else runs yet.

- `package.json` with `xrpl` dependency and a `start` script (`ts-node src/index.ts` or equivalent)
- `tsconfig.json` targeting Node.js
- `src/config.ts` exporting network URL, credential type string, and currency codes
- `src/utils.ts` exporting `submitAndLog(client, tx, wallet, label)` — wraps `submitAndWait` with autofill, logs label + tx hash on success, throws a descriptive error on failure
- `src/index.ts` stub that opens a client connection, logs "Connected", and closes cleanly
- `README.md` with prerequisites (Node version, Testnet access) and `npm install` / `npm start` instructions

### Acceptance criteria

- [ ] `npm install` completes without errors
- [ ] `npm start` connects to Testnet and logs "Connected" without throwing
- [ ] `config.ts` exports `NETWORK_URL`, `CREDENTIAL_TYPE` (plain string), and currency code constants
- [ ] `submitAndLog` logs the label and transaction hash on a successful `submitAndWait` call
- [ ] `submitAndLog` throws a descriptive error message when the transaction fails
- [ ] README covers Node.js version requirement, how to install, and how to run

---

## Phase 2: Account Funding

**User stories**: 1 (fund accounts in parallel)

### What to build

Implement `01-setup-accounts.ts` with a function that creates and funds all 6 wallets simultaneously using `Promise.all` over `client.fundWallet({ amount: "10" })`. The function returns all wallet objects. Wire it into `index.ts` so the funded wallets are available to all subsequent phases.

### Acceptance criteria

- [ ] All 6 wallets are funded in a single `Promise.all` call (not sequentially)
- [ ] Each wallet is funded with `"10"` XRP via the Testnet faucet
- [ ] The function returns named wallet objects (credentialIssuer, sender, mm, domainIssuer, rlusdIssuer, eurofIssuer)
- [ ] `index.ts` calls the setup function and logs each wallet's address after funding
- [ ] Running `npm start` at this point funds all 6 accounts and prints their addresses without error

---

## Phase 3: Credential Lifecycle

**User stories**: 2 (CredentialCreate), 3 (hex-encode CredentialType), 4 (CredentialAccept)

### What to build

Implement `02-credentials.ts` with a function that issues credentials from the Credential Issuer to the Sender and MM, then has each recipient accept their credential.

- Two `CredentialCreate` transactions (issuer → sender, issuer → MM), each using the hex-encoded `CredentialType`
- Two `CredentialAccept` transactions (sender accepts, MM accepts)
- `convertStringToHex` applied to the `CREDENTIAL_TYPE` string from `config.ts`
- All four transactions submitted via `submitAndLog`

### Acceptance criteria

- [ ] `CredentialType` is hex-encoded using `convertStringToHex` before being placed in any transaction
- [ ] Credential Issuer successfully issues a credential to Sender (tx confirmed on ledger)
- [ ] Credential Issuer successfully issues a credential to MM (tx confirmed on ledger)
- [ ] Sender successfully accepts their credential (tx confirmed on ledger)
- [ ] MM successfully accepts their credential (tx confirmed on ledger)
- [ ] Each transaction is logged with a meaningful label and its hash

---

## Phase 4: Permissioned Domain

**User stories**: 5 (PermissionedDomainSet)

### What to build

Implement `03-domain.ts` with a function that creates a permissioned domain via `PermissionedDomainSet`. The `Credentials` array references the Credential Issuer's address and the hex-encoded credential type. The function extracts and returns the resulting `DomainID` from the transaction metadata so downstream phases can attach it to offers.

### Acceptance criteria

- [ ] `PermissionedDomainSet` is submitted by the Domain Issuer and confirmed on the ledger
- [ ] The `Credentials` array contains the Credential Issuer's address and hex `CredentialType`
- [ ] The function parses and returns the `DomainID` from the transaction result
- [ ] `index.ts` receives the `DomainID` and passes it to the offer phases
- [ ] The `DomainID` is logged after domain creation

---

## Phase 5: Trustlines & IOU Funding

**User stories**: 6 (DefaultRipple on issuers), 7 (TrustSet with NoRipple), 8 (Payment from issuer)

### What to build

Implement `04-trustlines.ts` covering three sub-steps in order:

1. **AccountSet** — enable `asfDefaultRipple` on both RLUSD Issuer and EUROF Issuer using the AccountSetFlags enum provided by xrpl.
2. **TrustSet** — Sender establishes trustlines to RLUSD Issuer and EUROF Issuer (both with `tfSetNoRipple` provided by the xrpl enum); MM does the same
3. **Payment** — RLUSD Issuer sends 100,000 RLUSD to Sender; EUROF Issuer sends 100,000 EUROF to MM

All transactions submitted via `submitAndLog`.

### Acceptance criteria

- [ ] `asfDefaultRipple` is set on RLUSD Issuer (tx confirmed)
- [ ] `asfDefaultRipple` is set on EUROF Issuer (tx confirmed)
- [ ] Sender has trustlines to both RLUSD Issuer and EUROF Issuer with `tfSetNoRipple`
- [ ] MM has trustlines to both RLUSD Issuer and EUROF Issuer with `tfSetNoRipple`
- [ ] Sender receives 100,000 RLUSD from RLUSD Issuer (tx confirmed)
- [ ] MM receives 100,000 EUROF from EUROF Issuer (tx confirmed)

---

## Phase 6: Market Maker Order Book

**User stories**: 9 (multiple OfferCreate at spread rates), 10 (DomainID on offers)

### What to build

Implement `05-mm-offers.ts` with a function that submits 5 `OfferCreate` transactions from the MM account. Each offer sells EUROF and buys RLUSD at a slightly different rate (spread around 1.08 EUR/USD, e.g. 1.079–1.081), and all include the `DomainID` field received from Phase 4.

### Acceptance criteria

- [ ] 5 `OfferCreate` transactions are submitted by MM and confirmed on the ledger
- [ ] Each offer sells EUROF and buys RLUSD
- [ ] Exchange rates are spread slightly around 1.08 (e.g. five distinct rates between 1.079 and 1.081)
- [ ] Every offer includes the `DomainID` field
- [ ] Each offer is logged with its rate and transaction hash

---

## Phase 7: Sender Offer, Trade Execution & README

**User stories**: 11 (offer crossing), 12 (error messages), 13 (files per phase), 14 (inline comments), 15 (README)

### What to build

Implement `06-sender-offer.ts` with a single `OfferCreate` from the Sender that sells RLUSD and buys EUROF with a size and price that crosses at least one MM offer. Include the `DomainID`. Add inline comments to all `src/` files explaining what each transaction does and why. Finalize the README with a section describing the full trading flow, the role of each account, and expected console output.

### Acceptance criteria

- [ ] Sender's `OfferCreate` is submitted and confirmed on the ledger
- [ ] The offer includes the `DomainID` field
- [ ] The offer is sized to cross at least one existing MM offer
- [ ] All source files have inline comments explaining the purpose of each transaction and key protocol concepts
- [ ] Running `npm start` end-to-end completes without error and logs each phase's progress
- [ ] README describes the full flow, all 6 accounts and their roles, and what to expect in the output
