import { Client } from "xrpl";
import { NETWORK_URL } from "./config.js";
import { setupAccounts } from "./01-setup-accounts.js";
import { setupCredentials } from "./02-credentials.js";

async function main() {
  const client = new Client(NETWORK_URL);

  try {
    await client.connect();
    console.log("Connected to XRPL Testnet");

    // Phase 2 — Fund all 6 accounts
    const wallets = await setupAccounts(client);
    console.log("\n=== Funded Accounts ===");
    console.log(`Credential Issuer : ${wallets.credentialIssuer.address}`);
    console.log(`Sender            : ${wallets.sender.address}`);
    console.log(`Market Maker (MM) : ${wallets.mm.address}`);
    console.log(`Domain Issuer     : ${wallets.domainIssuer.address}`);
    console.log(`RLUSD Issuer      : ${wallets.rlusdIssuer.address}`);
    console.log(`EUROF Issuer      : ${wallets.eurofIssuer.address}`);

    // Phase 3 — Credential lifecycle
    console.log("\n=== Credentials ===");
    await setupCredentials(
      client,
      wallets.credentialIssuer,
      wallets.sender,
      wallets.mm,
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
