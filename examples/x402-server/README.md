# x402 demo server

A minimal x402-gated HTTP server that runs on your machine, so you can demonstrate the full Hedwig payment flow end to end without depending on any external service.

## What it does

- Listens on `http://localhost:4021`
- Exposes `GET /premium/quote` - returns HTTP 402 until you pay 0.001 USDC on Hedera testnet
- Verifies incoming payment signatures and submits the transaction to Hedera as the facilitator
- Returns a random wisdom quote plus a HashScan link to the settled payment

## How to run

From the project root, in a dedicated terminal window:

```
start-x402-server.bat
```

Or directly:

```
node examples/x402-server/server.mjs
```

Leave the window open. The server logs incoming challenges and settlements to stderr.

## Testing without Claude

Curl the endpoint. First hit returns a 402 challenge:

```bash
curl -v http://localhost:4021/premium/quote
```

Second hit with a signed payment header would return the quote. In practice you'd use the Hedwig `x402_fetch` MCP tool for that.

## Architectural note

For simplicity this demo uses one Hedera account for both the client (payer) and the server (facilitator + recipient). The payment is a self-transfer of 0.001 USDC. This still exercises the full x402 protocol - signature construction, header encoding, verification, on-chain settlement - just with the same account on both sides. A production x402 service would use a dedicated facilitator account, ideally in a separate process with its own key.

## Configuration

The server reads the same `.env` as the rest of Hedwig:

- `HEDERA_ACCOUNT_ID`
- `HEDERA_PRIVATE_KEY`
- `X402_SERVER_PORT` (optional, defaults to 4021)
