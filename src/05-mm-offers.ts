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

// Five distinct rates spread around 1.08 EUR/USD
const RATES = [1.079, 1.0795, 1.08, 1.0805, 1.081];

// Amount of EUROF each offer sells
const EUROF_SELL_AMOUNT = "1000";

/**
 * Phase 6 — Market Maker Order Book
 *
 * Submits 5 OfferCreate transactions from MM, each selling EUROF and buying
 * RLUSD at a slightly different rate spread around 1.08. Every offer includes
 * the DomainID so it participates in the permissioned DEX.
 */
export async function setupMMOffers(
  client: Client,
  mm: Wallet,
  eurofIssuer: Wallet,
  rlusdIssuer: Wallet,
  domainId: string,
): Promise<void> {
  // Submit offers sequentially to avoid Sequence conflicts on the same account
  for (const rate of RATES) {
    const rlusdBuyAmount = (parseFloat(EUROF_SELL_AMOUNT) * rate).toFixed(4);

    await submitAndLog(
      client,
      {
        TransactionType: "OfferCreate",
        Account: mm.address,
        TakerPays: {
          currency: RLUSD_HEX,
          issuer: rlusdIssuer.address,
          value: rlusdBuyAmount,
        },
        TakerGets: {
          currency: EUROF_HEX,
          issuer: eurofIssuer.address,
          value: EUROF_SELL_AMOUNT,
        },
        DomainID: domainId,
      },
      mm,
      `OfferCreate MM — sell ${EUROF_SELL_AMOUNT} EUROF @ ${rate} (buy ${rlusdBuyAmount} RLUSD)`,
    );
  }
}
