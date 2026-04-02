import { Client, convertStringToHex, Wallet } from "xrpl";
import {
  isCreatedNode,
  type Node,
} from "xrpl/dist/npm/models/transactions/metadata.js";
import { CREDENTIAL_TYPE } from "./config.js";
import { submitAndLog } from "./utils.js";

/**
 * Create a permissioned domain that references the credential issuer
 * and the hex-encoded credential type. Returns the DomainID from the
 * ledger so downstream offers can attach it.
 */
export async function setupDomain(
  client: Client,
  domainIssuer: Wallet,
  credentialIssuer: Wallet,
): Promise<string> {
  const credentialTypeHex = convertStringToHex(CREDENTIAL_TYPE);

  const result = await submitAndLog(
    client,
    {
      TransactionType: "PermissionedDomainSet",
      Account: domainIssuer.address,
      AcceptedCredentials: [
        {
          Credential: {
            Issuer: credentialIssuer.address,
            CredentialType: credentialTypeHex,
          },
        },
      ],
    },
    domainIssuer,
    "PermissionedDomainSet",
  );

  // Extract the DomainID from the CreatedNode metadata
  const meta = result.result.meta;

  if (typeof meta !== "object" || meta === null) {
    throw new Error("PermissionedDomainSet: missing transaction metadata");
  }

  const { AffectedNodes } = meta as { AffectedNodes: Node[] };

  for (const node of AffectedNodes) {
    if (
      isCreatedNode(node) &&
      node.CreatedNode.LedgerEntryType === "PermissionedDomain"
    ) {
      return node.CreatedNode.LedgerIndex;
    }
  }

  throw new Error(
    "PermissionedDomainSet: could not find DomainID in metadata",
  );
}
