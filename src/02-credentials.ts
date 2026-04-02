import { Client, convertStringToHex, Wallet } from "xrpl";
import { CREDENTIAL_TYPE } from "./config.js";
import { submitAndLog } from "./utils.js";

/**
 * Issue credentials from the Credential Issuer to Sender and MM,
 * then have each recipient accept their credential.
 */
export async function setupCredentials(
  client: Client,
  credentialIssuer: Wallet,
  sender: Wallet,
  mm: Wallet,
): Promise<void> {
  const credentialTypeHex = convertStringToHex(CREDENTIAL_TYPE);

  // CredentialCreate: issuer → sender
  await submitAndLog(
    client,
    {
      TransactionType: "CredentialCreate",
      Account: credentialIssuer.address,
      Subject: sender.address,
      CredentialType: credentialTypeHex,
    },
    credentialIssuer,
    "CredentialCreate (Issuer → Sender)",
  );

  // CredentialCreate: issuer → MM
  await submitAndLog(
    client,
    {
      TransactionType: "CredentialCreate",
      Account: credentialIssuer.address,
      Subject: mm.address,
      CredentialType: credentialTypeHex,
    },
    credentialIssuer,
    "CredentialCreate (Issuer → MM)",
  );

  // CredentialAccept: sender accepts
  await submitAndLog(
    client,
    {
      TransactionType: "CredentialAccept",
      Account: sender.address,
      Issuer: credentialIssuer.address,
      CredentialType: credentialTypeHex,
    },
    sender,
    "CredentialAccept (Sender)",
  );

  // CredentialAccept: MM accepts
  await submitAndLog(
    client,
    {
      TransactionType: "CredentialAccept",
      Account: mm.address,
      Issuer: credentialIssuer.address,
      CredentialType: credentialTypeHex,
    },
    mm,
    "CredentialAccept (MM)",
  );
}
