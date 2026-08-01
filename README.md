# Hedwig

An MCP wallet server that lets an AI agent hold and spend USDC on Hedera. Payments travel over HTTP using the x402 standard, which means agents can pay for API calls or gated content the same way a browser handles a login prompt. Every settlement is a real HTS transfer, done in about three seconds, for a fixed fee under a hundredth of a cent.

Built for the Hedera x402 bounty in July 2026.

## Why this exists

Agents already plan, reason, and execute. The moment they hit a 402 Payment Required response they stop and ask a human, which defeats the point of automation. x402 closes that gap by turning machine to machine payment into a first class HTTP operation. Hedwig is the wallet half of that story on Hedera, packaged as an MCP server so any host that speaks MCP (Claude Desktop, Cursor, Windsurf, and others) can drop it in.

## What it does

Seven MCP tools, each callable by the agent as needed.

**check_balance** returns HBAR and USDC balances, read from the Hedera Mirror Node REST API so the query never times out on gRPC. Comes with a HashScan link to the account.

**transfer_hbar** sends HBAR to any Hedera account. Real on-chain transfer, optional memo, HashScan link returned.

**transfer_usdc** sends USDC (HTS token 0.0.429274 on testnet, 0.0.456858 on mainnet). Same shape as transfer_hbar but for the token. Both accounts must be associated with the token.

**pay** signs an x402 payment authorization without submitting anything. Useful when you want to hand the signed header to your own HTTP client and drive the retry yourself.

**x402_fetch** does the full protocol loop for you. It fetches a URL, catches the 402 response, signs the payment, retries with the payment header attached, and returns the paid body along with the settlement receipt. This is the tool that makes the agent feel autonomous.

**spending_report** gives you session totals, current budget usage, and a rolling history of the last 25 payments.

**request_funding** returns your account ID and a link to the Hedera Portal faucet for topping up testnet HBAR.

Every tool that spends money runs through a SpendingTracker that enforces two caps from your config: MAX_PER_CALL and MAX_PER_DAY. The wallet refuses to sign anything above them, so a runaway loop in an agent cannot drain the account.

## Architecture

Two diagrams. The first shows the pieces at rest. The second shows what happens when the agent hits a paid endpoint.

### System layout

![System architecture](docs/architecture-system.svg)

The demo server is optional. It exists in the repo so you can exercise the full x402 flow on your own machine without depending on a third-party paid endpoint. The wallet itself works with any x402 compliant Hedera endpoint.

### Payment flow

![x402 payment flow](docs/architecture-flow.svg)

The signature the client produces authorizes a USDC transfer from buyer to resource server. The resource server acts as facilitator: it verifies the signature, submits the transaction to Hedera, and only serves the content once settlement succeeds. There is no escrow, no wrapped token, no bridge. The chain itself is the source of truth.

## Requirements

Node.js 18 or newer. Windows, macOS, or Linux.

A Hedera testnet account with a small HBAR balance for gas. The Hedera Portal (portal.hedera.com) hands out 1000 testnet HBAR the first time you sign up.

That is it. Association with USDC happens automatically the first time you run the smoke script.

## Install

```bash
npm install
npm run build
```

## Configure

Copy the environment template and fill in your credentials.

```bash
cp .env.example .env
```

Then edit `.env` and paste in your account ID and ECDSA private key from the Portal dashboard.

| Variable              | Meaning                                                | Default          |
| --------------------- | ------------------------------------------------------ | ---------------- |
| HEDERA_ACCOUNT_ID     | Your Hedera account ID, for example 0.0.12345          | required         |
| HEDERA_PRIVATE_KEY    | ECDSA or ED25519 private key, hex or DER               | required         |
| NETWORK               | hedera-testnet or hedera-mainnet                       | hedera-testnet   |
| MAX_PER_CALL          | Highest USDC amount the wallet will sign in one call   | 0.10             |
| MAX_PER_DAY           | Highest USDC amount the wallet will sign per UTC day   | 20.00            |
| X402_ASSET            | Asset the demo server charges: hbar or usdc            | hbar             |

The private key never leaves the process that runs the MCP server.

## Run

### One command, end to end

On Windows, double-click `run.bat`. On macOS or Linux, run `./run.sh`.

Either script does five things in order.

1. Install dependencies if `node_modules` is not present
2. Compile TypeScript into `dist/`
3. Run the unit test suite
4. Run an on-chain smoke test that produces two real HashScan links
5. Start the MCP server on stdio, ready for Claude Desktop to attach

Leave the terminal open while you use the wallet from Claude Desktop.

### Just the smoke test

If you have already installed and built, use `smoke.bat` or `npm run smoke` to re-run only the on-chain step. It takes about thirty seconds.

### Just the demo server

To run the local x402 demo server for the video, open a second terminal and run `start-x402-server.bat` (Windows) or `node examples/x402-server/server.mjs`. The server listens on `http://localhost:4021` and serves a paid quote endpoint at `/premium/quote`. On first startup it auto-creates its own dedicated Hedera account (funded by your operator, associated with USDC) so the payer and payee are always distinct.

## Wire into Claude Desktop

Edit the Claude Desktop config file.

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add this block, adjusting the path to `dist/index.js`.

```json
{
  "mcpServers": {
    "hedwig": {
      "command": "node",
      "args": ["C:\\path\\to\\hedwig\\dist\\index.js"],
      "env": {
        "HEDERA_ACCOUNT_ID": "0.0.YOUR_ID",
        "HEDERA_PRIVATE_KEY": "YOUR_ECDSA_KEY",
        "NETWORK": "hedera-testnet",
        "MAX_PER_CALL": "0.10",
        "MAX_PER_DAY": "20.00"
      }
    }
  }
}
```

Quit Claude Desktop fully from the system tray, then reopen it. Open a new chat and check the plug icon in the bottom-left corner. You should see `hedwig` listed with seven tools.

## Use it

Once installed, ask the agent whatever you want. A few prompts that exercise the interesting paths:

> Check my Hedera balance.

Calls `check_balance`, returns HBAR and USDC amounts with a HashScan link.

> Send 0.05 HBAR to 0.0.98 with the memo "coffee tip".

Calls `transfer_hbar`. Returns the transaction ID and a HashScan link.

> There is a paid API at http://localhost:4021/premium/quote. Fetch it and pay if it costs USDC.

Runs the full x402 loop. This is the demo that matters.

> Show me my spending report.

Calls `spending_report`. Shows what has been signed this session, plus how much budget is left.

## How the x402 flow lands on Hedera

x402 is network agnostic and Hedera is one of the supported chains, identified by the CAIP-2 strings `hedera:testnet` and `hedera:mainnet`. The Coinbase-published `@x402/hedera` SDK provides both the client signing scheme and the server side facilitator that verifies and submits payments.

A payment header carries an authorization to move a specific amount of USDC HTS from the buyer account to the seller account, along with the metadata needed for the facilitator to verify and settle. Once the transfer reaches consensus, HashScan shows it as a normal token transfer with the resource URL in the memo.

Because settlement is a real HTS transfer, there is no escrow contract, no reconciliation window, and no bridge. The receipt is the payment.

## Live testnet transactions

Every link below is a real transaction on Hedera testnet, submitted through the Hedwig MCP wallet during a live demo run. Click any to inspect on HashScan.

### Accounts

Buyer account (Hedwig client): [0.0.6886052 on HashScan](https://hashscan.io/testnet/account/0.0.6886052)

x402 server account (auto-created on first startup of the demo server): [0.0.9865777 on HashScan](https://hashscan.io/testnet/account/0.0.9865777)

### Demo transactions

| # | What                              | Prompt                                                                        | On-chain proof                                                                                                                                    |
| - | --------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | HBAR transfer                     | "Send 0.05 HBAR to 0.0.9865777 with the memo 'testing hedwig'"                | [0.0.6886052-1785556514-498454371](https://hashscan.io/testnet/transaction/0.0.6886052-1785556514-498454371) |
| 2 | USDC transfer                     | "Send 0.001 USDC to 0.0.9865777"                                              | [0.0.6886052-1785556535-966482234](https://hashscan.io/testnet/transaction/0.0.6886052-1785556535-966482234) |
| 3 | x402 payment in USDC (first run)  | "Try to access http://localhost:4021/premium/quote and pay if it costs USDC"  | [0.0.9865777-1785556125-503661238](https://hashscan.io/testnet/transaction/0.0.9865777-1785556125-503661238) |
| 4 | x402 payment in USDC (repeat)     | "Fetch http://localhost:4021/premium/quote and pay if it costs USDC"          | [0.0.9865777-1785556582-000507004](https://hashscan.io/testnet/transaction/0.0.9865777-1785556582-000507004) |

Transactions 3 and 4 are the heart of the project. The agent hit a 402 Payment Required response, signed a Hedera USDC transfer on its own, retried the request with the payment signature header, and only received the paid content once the transfer reached consensus. No wallet popup, no manual approval, no bridge, no facilitator hop across chains. Real HTS settlement in about three seconds, for a fee well under one hundredth of a cent.

Notice that the two x402 transaction IDs start with `0.0.9865777@` (the server account) rather than `0.0.6886052@`. That is because the resource server pays the HBAR gas as facilitator, not the buyer. The buyer only signs the USDC transfer authorization. This is the gasless UX that x402 promises.

The two quotes the paid endpoint returned across the two runs, for the record:

> "In the middle of every difficulty lies opportunity."
> - Albert Einstein

> "The best time to plant a tree was 20 years ago. The second best time is now."
> - Chinese proverb

## Repository layout

```
src/
  index.ts                  Entry point. Redirects logs to stderr and boots MCP.
  server.ts                 Registers the seven tools on the MCP server.
  config.ts                 Environment variable parsing with validation.
  hedera.ts                 Client factories, USDC token IDs, HashScan URL helpers.
  mirror.ts                 Hedera Mirror Node REST helpers for balance queries.
  spending.ts               Budget caps and session history.
  tools/
    check-balance.ts
    transfer-hbar.ts
    transfer-usdc.ts
    pay.ts
    x402-fetch.ts
    spending-report.ts
    request-funding.ts
__tests__/                  Vitest suites for spending, config, and Hedera helpers.
examples/
  x402-server/              Local paid endpoint used for the demo video.
docs/
  architecture-system.svg   System layout diagram.
  architecture-flow.svg     x402 payment flow sequence diagram.
manifest.json               MCPB bundle manifest for one-click Claude Desktop install.
scripts/
  smoke.mjs                 End-to-end smoke test that produces HashScan links.
  build-mcpb.sh             Zips dist plus manifest into an .mcpb bundle.
run.bat, run.sh             Full end-to-end runner (install, build, test, smoke, serve).
smoke.bat                   Fast smoke-only runner.
start-x402-server.bat       Starts the local paid endpoint on port 4021.
```

## Design notes and trade-offs

The wallet does not implement a facilitator. If you want to accept payments in your own service you either delegate settlement to a hosted facilitator like BlockyDevs' or run your own using `@x402/hedera/exact/facilitator`. The demo server in `examples/x402-server` uses the latter approach so you can see how it fits together.

Balance queries go through the Mirror Node REST API instead of consensus node gRPC. The gRPC path is unreliable from cross-region traffic, especially from India where the SDK sometimes routes to a slow node and times out. Mirror Node is HTTP, geographically load balanced, and never blocks the wallet.

ECDSA keys are supported alongside ED25519, so a private key exported from MetaMask works unchanged.

The demo server creates its own dedicated Hedera account on first startup rather than sharing the buyer's key. This is necessary because the x402 facilitator's verify step checks that the payTo account actually receives a net positive transfer, and a self-transfer between the same account nets to zero. Auto-creation costs about six HBAR from the operator account, which the testnet faucet provides for free.

## Roadmap

Auto-association on first paid request. When a resource server accepts a token the client is not associated with, the wallet could run the `TokenAssociateTransaction` inline before signing the payment.

Recurring subscriptions using the `batch-settlement` scheme, so an agent can subscribe to a paid feed instead of paying per request.

Receipts to a Hedera Consensus Service topic. Each successful payment could publish a small proof to a topic, giving a cross-app audit log that is cheaper than storing on chain state.

A CLI shim so the wallet is usable outside an MCP host, for CI jobs or headless deployments.
