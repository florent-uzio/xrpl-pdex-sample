import { Client, Wallet } from "xrpl";

export interface Wallets {
  credentialIssuer: Wallet;
  sender: Wallet;
  mm: Wallet;
  domainIssuer: Wallet;
  rlusdIssuer: Wallet;
  eurofIssuer: Wallet;
}

/** Fund all 6 accounts in parallel via the Testnet faucet. */
export async function setupAccounts(client: Client): Promise<Wallets> {
  const [
    credentialIssuer,
    sender,
    mm,
    domainIssuer,
    rlusdIssuer,
    eurofIssuer,
  ] = await Promise.all(
    Array.from({ length: 6 }, () => client.fundWallet(null, { amount: "10" })),
  );

  return {
    credentialIssuer: credentialIssuer.wallet,
    sender: sender.wallet,
    mm: mm.wallet,
    domainIssuer: domainIssuer.wallet,
    rlusdIssuer: rlusdIssuer.wallet,
    eurofIssuer: eurofIssuer.wallet,
  };
}
