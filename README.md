# Hedwig

An MCP wallet server that lets an AI agent hold, send, and spend USDC on Hedera. Payments happen over HTTP through the x402 standard, so agents can pull paid data or call paid APIs the same way a human clicks "buy". Every payment settles on Hedera as a real HTS token transfer, in seconds, for a fixed thousandth-of-a-cent fee.

Built for the Hedera x402 bounty (July 2026).

## Why

An agent can plan, reason, and execute, but the moment it hits a `402 Payment Required` it stops and asks a human. That gap is what x402 closes: an HTTP-native, wallet-native way for software to pay software. Hedwig is the wallet end of that story on Hedera, packaged as an MCP server so any MCP-capable host (Claude Desktop, Cursor, Windsurf, and so on) can drop it in.

## What it does

Six tools, each a JSON-RPC MCP endpoint:

- `check_balance` returns HBAR and USDC balances with a HashScan link
- `transfer_hbar` sends HBAR to any Hedera account with a signed on-chain transfer
- `transfer_usdc` sends USDC (HTS token 0.0.429274 on testnet, 0.0.456858 on mainnet)
- `pay` signs an x402 payment header without sending the request itself, useful for custom flows
- `x402_fetch` does the full loop: hit a URL, catch the 402, sign, retry, return the paid body
- `spending_report` reports session spend, budget usage, and the last 25 payments

Every tool that spends money runs through a `SpendingTracker` that enforces two ceilings from your config: `MAX_PER_CALL` and `MAX_PER_DAY`. The wallet refuses to sign anything above them, so a runaway loop cannot drain the account.

## Requirements

- Node.js 18 or newer
- A Hedera testnet account. The [Hedera Portal](https://portal.hedera.com) hands out 1000 testnet HBAR the first time you sign up.
- Testnet USDC in that account. Testnet USDC on Hedera is HTS token `0.0.429274`. Your account must be associated with it before it can hold any. Association is a one-line operation from any Hedera wallet UI or from HashPack, Blade, or Kabila.
- Optionally, MetaMask configured with Hedera JSON-RPC if you want to use the same ECDSA key on both sides. Hedera accepts ECDSA keys directly, so a MetaMask-exported private key works with Hedwig unchanged.

## Install

```bash
npm install
npm run build
```

The build compiles the TypeScript sources under `src/` into `dist/index.js`, which is the file the MCP host will spawn.

## Configure

Copy `.env.example` to `.env` and fill in your account ID and private key. The five variables are:

| Variable              | Meaning                                              | Default             |
| --------------------- | ---------------------------------------------------- | ------------------- |
| `HEDERA_ACCOUNT_ID`   | Your Hedera account ID, e.g. `0.0.12345`             | required            |
| `HEDERA_PRIVATE_KEY`  | ECDSA or ED25519 private key (hex or DER)            | required            |
| `NETWORK`             | `hedera-testnet` or `hedera-mainnet`                 | `hedera-testnet`    |
| `MAX_PER_CALL`        | Highest USDC amount the wallet will spend at a time  | `0.10`              |
| `MAX_PER_DAY`         | Highest USDC amount the wallet will spend per UTC day| `20.00`             |

The private key never leaves the process running the MCP server. Claude Desktop's `.mcpb` install path additionally stores it in the OS keychain rather than plain text.

## Wire it into Claude Desktop

Two ways. Pick one.

### JSON config

Add this block to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hedwig": {
      "command": "node",
      "args": ["/absolute/path/to/hedwig/dist/index.js"],
      "env": {
        "HEDERA_ACCOUNT_ID": "0.0.YOUR_ID",
        "HEDERA_PRIVATE_KEY": "YOUR_PRIVATE_KEY",
        "NETWORK": "hedera-testnet",
        "MAX_PER_CALL": "0.10",
        "MAX_PER_DAY": "20.00"
      }
    }
  }
}
```

Config file location:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### MCPB bundle (one-click)

```bash
npm run build:mcpb
```

This produces `hedwig-wallet.mcpb`. Double-click it. Claude Desktop installs the extension, prompts for the five config values with the private key stored in the keychain, and the tools appear.

## Use it

Once installed, ask the agent something like:

> Check my Hedera balance.

or

> Fetch `https://demo-x402-api.example.com/premium/quote` and pay the fee if there is one.

The second prompt walks the full loop: initial GET, 402 response, `pay`-style signature over the HTS USDC transfer, retry with the signature header, return the paid body along with the settlement receipt and HashScan link.

## How the x402 flow lands on Hedera

x402 is transport-agnostic and Hedera is one of its supported networks (CAIP-2 identifiers `hedera:testnet` and `hedera:mainnet`). The Coinbase `@x402/hedera` SDK handles the signing scheme. Under the hood a payment header carries an authorization to move a specific amount of USDC HTS from your account to the resource server's account, along with the metadata needed for a facilitator to verify and submit the transfer. Once the transfer settles, HashScan shows it as a normal token transfer with the resource URL in the memo.

Because settlement is a real HTS transfer, there is no escrow, no bridge, no wrapped token, and no reconciliation window. The receipt is the payment.

## Architecture

```
┌──────────────────┐
│    AI agent      │
│ (Claude, Cursor) │
└────────┬─────────┘
         │ MCP over stdio
         ▼
┌──────────────────┐
│   Hedwig MCP     │
│ ───────────────  │
│ check_balance    │
│ transfer_hbar    │
│ transfer_usdc    │
│ pay              │
│ x402_fetch       │
│ spending_report  │
└────────┬─────────┘
         │ @hashgraph/sdk (native)
         │ @x402/hedera   (payment headers)
         ▼
┌──────────────────┐
│   Hedera network │
│ HTS USDC, HBAR   │
└──────────────────┘
```

## Repository layout

```
src/
  index.ts             Entry point. Redirects logs to stderr, then boots MCP.
  server.ts            MCP server assembly. Registers the six tools.
  config.ts            Env var parsing with validation.
  hedera.ts            Client factories, USDC token IDs, HashScan URL helpers.
  spending.ts          Budget ceilings, session history, daily reset at UTC midnight.
  tools/
    check-balance.ts
    transfer-hbar.ts
    transfer-usdc.ts
    pay.ts
    x402-fetch.ts
    spending-report.ts
    request-funding.ts
__tests__/             Vitest suites for spending, config, and Hedera helpers.
manifest.json          MCPB bundle manifest for one-click Claude Desktop install.
scripts/build-mcpb.sh  Zips dist + manifest into an .mcpb bundle.
```

## Roadmap

- Auto-association: on first paid request to an unassociated token, run `TokenAssociate` before signing.
- Recurring x402 subscriptions using the `batch-settlement` scheme.
- Optional CLI shim so the wallet is usable outside an MCP host, for CI and headless deployments.
- Signature receipts to a Hedera Consensus Service topic, giving each payment an auditable, cross-app log.

## License

MIT. See `LICENSE`.
