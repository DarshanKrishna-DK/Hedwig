# Setup

## 1. Prerequisites

- **Node.js 18+**. Check with `node -v`. If missing, install from https://nodejs.org.
- **A Hedera testnet account** with a small HBAR balance. Get one for free at https://portal.hedera.com. First-time sign-up hands out 1000 testnet HBAR.
- Optional: **HashPack** or **Blade** if you want a graphical wallet view alongside the MCP wallet.

## 2. Get your credentials

From the Hedera portal dashboard, copy two values:

- **Account ID**, of the form `0.0.XXXXXX`
- **ECDSA Private Key**, a hex string starting with `0x` or without

Keep both handy. You will paste them into `.env` in the next step.

## 3. Configure locally

From the project root:

```bash
cp .env.example .env
```

Open `.env` in any editor and fill in:

```
HEDERA_ACCOUNT_ID=0.0.YOUR_ID
HEDERA_PRIVATE_KEY=YOUR_ECDSA_KEY
NETWORK=hedera-testnet
MAX_PER_CALL=0.10
MAX_PER_DAY=20.00
```

`.env` is git-ignored, so this file stays local.

## 4. Run the end-to-end script

### On Windows

Double-click `run.bat`, or from PowerShell / cmd:

```
.\run.bat
```

### On macOS or Linux

```bash
./run.sh
```

Either script does:

1. `npm install` if `node_modules` is not present
2. `npm run build` to compile TypeScript
3. `npm test` to run the unit suite
4. `npm run smoke` to submit real testnet transactions and print HashScan links

Expect the smoke run to take 30 to 60 seconds. Hedera testnet finality is roughly 3 seconds per transaction, and the script submits three or four.

## 5. Copy your HashScan links

At the end of the smoke run you will see a block like:

```
┌──────────────────────────────────────────────────────────┐
│  Submission-ready HashScan links                        │
└──────────────────────────────────────────────────────────┘
  - USDC token association
    https://hashscan.io/testnet/transaction/0.0.12345-1754000000.000000000
  - HBAR transfer (0.01 HBAR)
    https://hashscan.io/testnet/transaction/0.0.12345-1754000001.000000000

  Account explorer: https://hashscan.io/testnet/account/0.0.12345
```

These are the on-chain proofs the bounty asks for. Paste them into the Hedera submission form.

## 6. Wire the wallet into an agent (optional but expected for the demo video)

To show an agent actually paying for something, install the compiled server into Claude Desktop:

Edit `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add this block (adjust the `args` path to match where you cloned Hedwig):

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

Restart Claude Desktop. In a new chat, the six Hedwig tools should be listed under the plug icon.

Try prompting: **"Check my Hedera balance and then send 0.01 HBAR to 0.0.98."** Claude should call `check_balance` then `transfer_hbar`, and you can watch it happen in HashScan.

## Troubleshooting

**"Invalid signature"** — the private key does not match the account ID. Re-copy both from the portal dashboard.

**"TOKEN_NOT_ASSOCIATED_TO_ACCOUNT"** — you have not been associated with USDC yet. Re-run `run.bat` / `run.sh`; the smoke script auto-associates.

**"INSUFFICIENT_PAYER_BALANCE"** — your account is out of testnet HBAR. Go back to the portal and top up, or wait for the next faucet cycle.

**Smoke run hangs on the SDK import** — Node version too old. Upgrade to 18 or newer.

**MCP tools do not appear in Claude Desktop** — check that the path in `args` points at the compiled `dist/index.js`, not `src/index.ts`. Restart Claude Desktop fully (quit and reopen; a window reload is not enough).
