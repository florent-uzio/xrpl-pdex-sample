import { Client, convertStringToHex, Wallet } from "xrpl";
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

// The sender wants to buy 500 EUROF at a rate of 1.082 RLUSD/EUROF.
// This is above the MM's best ask (1.079), so the offer will cross
// at least one existing MM offer and execute immediately on-ledger.
const EUROF_BUY_AMOUNT = "500";
const RATE = 1.082;

/**
 * Phase 7 — Sender Offer & Trade Execution
 *
 * Submits a single OfferCreate from the Sender that sells RLUSD and buys EUROF.
 * The price is set above the Market Maker's best ask so the offer crosses
 * immediately, executing a trade on the permissioned DEX.
 */
export async function submitSenderOffer(
  client: Client,
  sender: Wallet,
  rlusdIssuer: Wallet,
  eurofIssuer: Wallet,
  domainId: string,
): Promise<void> {
  const rlusdSellAmount = (parseFloat(EUROF_BUY_AMOUNT) * RATE).toFixed(4);

  // OfferCreate: Sender sells RLUSD (TakerGets) and buys EUROF (TakerPays).
  // Including the DomainID restricts this offer to the permissioned domain,
  // meaning only participants with accepted credentials can trade against it.
  await submitAndLog(
    client,
    {
      TransactionType: "OfferCreate",
      Account: sender.address,
      TakerPays: {
        currency: EUROF_HEX,
        issuer: eurofIssuer.address,
        value: EUROF_BUY_AMOUNT,
      },
      TakerGets: {
        currency: RLUSD_HEX,
        issuer: rlusdIssuer.address,
        value: rlusdSellAmount,
      },
      DomainID: domainId,
    },
    sender,
    `OfferCreate Sender — buy ${EUROF_BUY_AMOUNT} EUROF @ ${RATE} (sell ${rlusdSellAmount} RLUSD)`,
  );
}
