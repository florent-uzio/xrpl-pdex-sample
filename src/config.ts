// XRPL Testnet WebSocket endpoint — used for all ledger interactions
export const NETWORK_URL = "wss://s.altnet.rippletest.net:51233";

// Plain-text credential type — hex-encoded before use in transactions
export const CREDENTIAL_TYPE = "EUROF_Approved";

// IOU currency codes — both are non-standard (>3 chars) so they must be
// hex-encoded and zero-padded to 40 characters before use in transactions
export const RLUSD_CURRENCY = "RLUSD";
export const EUROF_CURRENCY = "EUROF";
