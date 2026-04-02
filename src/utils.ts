import { Client, SubmittableTransaction, Wallet } from "xrpl";

export async function submitAndLog(
  client: Client,
  tx: SubmittableTransaction,
  wallet: Wallet,
  label: string,
): Promise<ReturnType<Client["submitAndWait"]>> {
  const result = await client.submitAndWait(tx, {
    autofill: true,
    wallet,
  });

  const meta = result.result.meta;
  const txResult =
    typeof meta === "object" && meta !== null
      ? (meta as { TransactionResult: string }).TransactionResult
      : undefined;

  if (txResult !== "tesSUCCESS") {
    throw new Error(`${label} failed: ${txResult ?? "unknown error"}`);
  }

  console.log(`${label} — tx hash: ${result.result.hash}`);
  return result;
}
