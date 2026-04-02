import {
  AccountSetAsfFlags,
  Client,
  convertStringToHex,
  TrustSetFlags,
  Wallet,
} from "xrpl";
import { EUROF_CURRENCY, RLUSD_CURRENCY } from "./config.js";
import { submitAndLog } from "./utils.js";

/** Hex-encode currencies longer than 3 characters (XRPL non-standard codes). */
function encodeCurrency(currency: string): string {
  if (currency.length > 3) {
    return convertStringToHex(currency).padEnd(40, "0");
  }
  return currency;
}

const RLUSD_HEX = encodeCurrency(RLUSD_CURRENCY);
const EUROF_HEX = encodeCurrency(EUROF_CURRENCY);

/**
 * Phase 5 — Trustlines & IOU Funding
 *
 * 1. Enable DefaultRipple on both token issuers so their IOUs can flow.
 * 2. Sender and MM each create trustlines to both issuers (with NoRipple).
 * 3. Fund Sender with RLUSD and MM with EUROF.
 */
export async function setupTrustlines(
  client: Client,
  rlusdIssuer: Wallet,
  eurofIssuer: Wallet,
  sender: Wallet,
  mm: Wallet,
): Promise<void> {
  // 1. Enable asfDefaultRipple on both issuers
  await Promise.all([
    submitAndLog(
      client,
      {
        TransactionType: "AccountSet",
        Account: rlusdIssuer.address,
        SetFlag: AccountSetAsfFlags.asfDefaultRipple,
      },
      rlusdIssuer,
      "AccountSet DefaultRipple — RLUSD Issuer",
    ),
    submitAndLog(
      client,
      {
        TransactionType: "AccountSet",
        Account: eurofIssuer.address,
        SetFlag: AccountSetAsfFlags.asfDefaultRipple,
      },
      eurofIssuer,
      "AccountSet DefaultRipple — EUROF Issuer",
    ),
  ]);

  // 2. Establish trustlines (sequential per account to avoid Sequence conflicts)
  await submitAndLog(
    client,
    {
      TransactionType: "TrustSet",
      Account: sender.address,
      LimitAmount: {
        currency: RLUSD_HEX,
        issuer: rlusdIssuer.address,
        value: "1000000",
      },
      Flags: TrustSetFlags.tfSetNoRipple,
    },
    sender,
    "TrustSet Sender → RLUSD Issuer",
  );
  await submitAndLog(
    client,
    {
      TransactionType: "TrustSet",
      Account: sender.address,
      LimitAmount: {
        currency: EUROF_HEX,
        issuer: eurofIssuer.address,
        value: "1000000",
      },
      Flags: TrustSetFlags.tfSetNoRipple,
    },
    sender,
    "TrustSet Sender → EUROF Issuer",
  );
  await submitAndLog(
    client,
    {
      TransactionType: "TrustSet",
      Account: mm.address,
      LimitAmount: {
        currency: RLUSD_HEX,
        issuer: rlusdIssuer.address,
        value: "1000000",
      },
      Flags: TrustSetFlags.tfSetNoRipple,
    },
    mm,
    "TrustSet MM → RLUSD Issuer",
  );
  await submitAndLog(
    client,
    {
      TransactionType: "TrustSet",
      Account: mm.address,
      LimitAmount: {
        currency: EUROF_HEX,
        issuer: eurofIssuer.address,
        value: "1000000",
      },
      Flags: TrustSetFlags.tfSetNoRipple,
    },
    mm,
    "TrustSet MM → EUROF Issuer",
  );

  // 3. Fund accounts with IOUs
  await Promise.all([
    submitAndLog(
      client,
      {
        TransactionType: "Payment",
        Account: rlusdIssuer.address,
        Destination: sender.address,
        Amount: {
          currency: RLUSD_HEX,
          issuer: rlusdIssuer.address,
          value: "100000",
        },
      },
      rlusdIssuer,
      "Payment 100,000 RLUSD → Sender",
    ),
    submitAndLog(
      client,
      {
        TransactionType: "Payment",
        Account: eurofIssuer.address,
        Destination: mm.address,
        Amount: {
          currency: EUROF_HEX,
          issuer: eurofIssuer.address,
          value: "100000",
        },
      },
      eurofIssuer,
      "Payment 100,000 EUROF → MM",
    ),
  ]);
}
