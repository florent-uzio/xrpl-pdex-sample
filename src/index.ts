import { Client } from "xrpl";
import { NETWORK_URL } from "./config.js";

async function main() {
  const client = new Client(NETWORK_URL);

  try {
    await client.connect();
    console.log("Connected to XRPL Testnet");
  } finally {
    await client.disconnect();
    console.log("Disconnected");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
