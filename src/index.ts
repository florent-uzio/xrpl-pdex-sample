import { Client } from "xrpl";
import { NETWORK_URL } from "./config.js";
import { setupAccounts } from "./01-setup-accounts.js";
import { setupCredentials } from "./02-credentials.js";
import { setupDomain } from "./03-domain.js";
import { setupTrustlines } from "./04-trustlines.js";
import { setupMMOffers } from "./05-mm-offers.js";
import { submitSenderOffer } from "./06-sender-offer.js";

/**
 * Orchestrates the full permissioned DEX trading flow.
 *
 * Each phase builds on the outputs of the previous one:
 *   Accounts → Credentials → Domain → Trustlines → MM Offers → Sender Trade
 */
async function main() {
  const client = new Client(NETWORK_URL);

  try {
    await client.connect();
    console.log("Connected to XRPL Testnet");

    // Phase 2 — Fund all 6 accounts via the Testnet faucet
    const wallets = await setupAccounts(client);
    console.log("\n=== Funded Accounts ===");
    console.log(`Credential Issuer : ${wallets.credentialIssuer.address}`);
    console.log(`Sender            : ${wallets.sender.address}`);
    console.log(`Market Maker (MM) : ${wallets.mm.address}`);
    console.log(`Domain Issuer     : ${wallets.domainIssuer.address}`);
    console.log(`RLUSD Issuer      : ${wallets.rlusdIssuer.address}`);
    console.log(`EUROF Issuer      : ${wallets.eurofIssuer.address}`);

    // Phase 3 — Issue and accept credentials so Sender and MM can trade on the permissioned DEX
    console.log("\n=== Credentials ===");
    await setupCredentials(
      client,
      wallets.credentialIssuer,
      wallets.sender,
      wallets.mm,
    );

    // Phase 4 — Create a permissioned domain that gates DEX access via credentials
    console.log("\n=== Permissioned Domain ===");
    const domainId = await setupDomain(
      client,
      wallets.domainIssuer,
      wallets.credentialIssuer,
    );
    console.log(`DomainID: ${domainId}`);

    // Phase 5 — Set up trustlines and fund Sender with RLUSD, MM with EUROF
    console.log("\n=== Trustlines & IOU Funding ===");
    await setupTrustlines(
      client,
      wallets.rlusdIssuer,
      wallets.eurofIssuer,
      wallets.sender,
      wallets.mm,
    );

    // Phase 6 — MM places 5 sell-EUROF offers at slightly different rates
    console.log("\n=== Market Maker Offers ===");
    await setupMMOffers(
      client,
      wallets.mm,
      wallets.eurofIssuer,
      wallets.rlusdIssuer,
      domainId,
    );

    // Phase 7 — Sender crosses the MM's best offer, executing a trade
    console.log("\n=== Sender Offer (Trade Execution) ===");
    await submitSenderOffer(
      client,
      wallets.sender,
      wallets.rlusdIssuer,
      wallets.eurofIssuer,
      domainId,
    );
  } finally {
    await client.disconnect();
    console.log("\nDisconnected");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
