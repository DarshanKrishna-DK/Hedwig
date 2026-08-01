import { motion } from "framer-motion";
import { useState } from "react";
import {
  Zap,
  Settings,
  Wrench,
  Coins,
  Server,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Copy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GITHUB_REPO_URL } from "../config/site";

const QUICKSTART_BASH = `# Clone and install
git clone ${GITHUB_REPO_URL}.git
cd Hedwig && npm install

# Configure environment
cp .env.example .env
# Paste your Hedera testnet Account ID and ECDSA private key
# from https://portal.hedera.com/dashboard

# Build
npm run build

# Run end to end: install, build, test, on-chain smoke, MCP server
run.bat        # Windows
./run.sh       # macOS / Linux`;

const CLAUDE_CONFIG = `{
  "mcpServers": {
    "hedwig": {
      "command": "node",
      "args": ["C:/path/to/Hedwig/dist/index.js"],
      "env": {
        "HEDERA_ACCOUNT_ID": "0.0.YOUR_ID",
        "HEDERA_PRIVATE_KEY": "YOUR_ECDSA_KEY",
        "NETWORK": "hedera-testnet",
        "MAX_PER_CALL": "0.10",
        "MAX_PER_DAY": "20.00"
      }
    }
  }
}`;

const ENV_TABLE = `HEDERA_ACCOUNT_ID    Your Hedera account ID, e.g. 0.0.12345      required
HEDERA_PRIVATE_KEY   ECDSA or ED25519 private key                required
NETWORK              hedera-testnet or hedera-mainnet            hedera-testnet
MAX_PER_CALL         Max USDC per single signature               0.10
MAX_PER_DAY          Max USDC per UTC day                        20.00
X402_ASSET           Demo server asset (hbar or usdc)            hbar`;

const CHECK_BALANCE = `> Check my Hedera balance.

[Hedwig] check_balance

  Account: 0.0.6886052
  Network: hedera-testnet
  HBAR: 993.39971112
  USDC: 19.999000 (associated)
  Explorer: https://hashscan.io/testnet/account/0.0.6886052`;

const X402_FETCH = `> Fetch http://localhost:4021/premium/quote and pay in
  USDC if it costs money.

[Hedwig] x402_fetch

  first fetch  -> 402 Payment Required
  challenge    -> 0.001 USDC to 0.0.9865777 on hedera:testnet
  budget       -> 0.001 <= 0.10 per-call cap, PASS
  signing      -> USDC transfer authorization
  retry        -> POST with payment-signature header
  server       -> verify OK, settle OK
  response     -> 200 OK

  Quote: "The best time to plant a tree was 20 years ago.
          The second best time is now."
  Author: Chinese proverb
  Paid:   0.001 USDC
  Tx:     0.0.6886052@178...
  HashScan: https://hashscan.io/testnet/transaction/...`;

const SERVER_START = `# Terminal 1: run the demo x402 server
start-x402-server.bat            # Windows
node examples/x402-server/server.mjs

# On first launch it auto-creates its own Hedera account,
# funds it with 5 HBAR from your operator, and associates
# with USDC. Look for lines like:
#
# [x402-server] Created server account: 0.0.9865777
# [x402-server] Associated server account with USDC
#
# Subsequent launches reuse the same account (saved to
# server-account.json, git-ignored).`;

interface DocSection {
  id: string;
  icon: LucideIcon;
  title: string;
  content: React.ReactNode;
}

function CodeBlock({ code, lang = "" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg border border-border bg-[#080808] overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <span className="text-[10px] text-text-muted font-mono">{lang}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text transition-colors"
        >
          <Copy size={10} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed font-mono text-text-muted">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const sections: DocSection[] = [
  {
    id: "quickstart",
    icon: Zap,
    title: "Quick Start",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          Get Hedwig running in under three minutes. You need Node.js 18 or newer and a Hedera testnet account. The Portal at{" "}
          <a href="https://portal.hedera.com" target="_blank" rel="noopener noreferrer" className="text-pink hover:underline">portal.hedera.com</a>
          {" "}gives you 1000 testnet HBAR the first time you sign up. That covers gas and the auto-created x402 server account.
        </p>
        <CodeBlock lang="bash" code={QUICKSTART_BASH} />
        <p className="text-text-muted leading-relaxed">
          The <code className="text-pink font-mono text-sm">run.bat</code> script installs deps, compiles TypeScript, runs unit tests, submits a real on-chain smoke transaction, then starts the MCP server on stdio. Leave the terminal open while you use the wallet from Claude Desktop.
        </p>
      </>
    ),
  },
  {
    id: "configuration",
    icon: Settings,
    title: "Configuration",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          Six environment variables. Copy <code className="text-pink font-mono text-sm">.env.example</code> to <code className="text-pink font-mono text-sm">.env</code> and fill in the required ones. The private key never leaves the process that runs the MCP server.
        </p>
        <CodeBlock lang="env" code={ENV_TABLE} />
        <p className="text-text-muted leading-relaxed mt-4 mb-2">
          To wire Hedwig into Claude Desktop, edit its config file:
        </p>
        <ul className="text-text-muted text-sm space-y-1 mb-4 ml-4">
          <li>&bull; macOS: <code className="text-pink font-mono text-xs">~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
          <li>&bull; Windows: <code className="text-pink font-mono text-xs">%APPDATA%\Claude\claude_desktop_config.json</code></li>
        </ul>
        <CodeBlock lang="json" code={CLAUDE_CONFIG} />
        <p className="text-text-muted leading-relaxed">
          After editing, fully quit Claude Desktop from the system tray, then reopen. Start a new chat and click the plug icon at the bottom-left. Hedwig should be listed with seven tools.
        </p>
      </>
    ),
  },
  {
    id: "tools",
    icon: Wrench,
    title: "The Seven Tools",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          Every tool is JSON-RPC callable through the MCP protocol. Descriptions are what Claude sees in its tool list.
        </p>
        <div className="space-y-4">
          {[
            { name: "check_balance", desc: "Return HBAR and USDC balances plus a HashScan account link. Reads from Mirror Node REST for reliability." },
            { name: "transfer_hbar", desc: "Send HBAR to any Hedera account. Real on-chain transfer, optional memo, HashScan link returned." },
            { name: "transfer_usdc", desc: "Send USDC (HTS token 0.0.429274 on testnet) to another USDC-associated account." },
            { name: "pay", desc: "Sign an x402 payment authorization without submitting anything. Useful when you drive the HTTP retry yourself." },
            { name: "x402_fetch", desc: "Full protocol loop: fetch a URL, catch the 402, sign the payment, retry with the signature header, return the paid body plus HashScan link." },
            { name: "spending_report", desc: "Session totals, budget usage, and a rolling history of the last 25 signed payments." },
            { name: "request_funding", desc: "Return your account ID plus a link to the Hedera Portal faucet, for topping up testnet HBAR." },
          ].map((t) => (
            <div key={t.name} className="rounded-lg border border-border bg-bg-card p-4">
              <code className="text-pink font-mono text-sm font-semibold">{t.name}</code>
              <p className="text-text-muted text-sm mt-2 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "usage",
    icon: Coins,
    title: "Common Prompts",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          Anything the agent can express in English, it can now settle on chain. Two representative examples.
        </p>
        <p className="text-text-muted text-sm mt-6 mb-2 font-medium">Check what you hold:</p>
        <CodeBlock lang="chat" code={CHECK_BALANCE} />
        <p className="text-text-muted text-sm mt-6 mb-2 font-medium">Pay for a gated API:</p>
        <CodeBlock lang="chat" code={X402_FETCH} />
      </>
    ),
  },
  {
    id: "server",
    icon: Server,
    title: "Local x402 Server",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          The repo ships with a minimal x402 server so you can demonstrate the full flow without depending on any public paid endpoint. It listens on <code className="text-pink font-mono text-sm">http://localhost:4021</code> and sells a wisdom quote for 0.001 HBAR (default) or 0.001 USDC (with <code className="text-pink font-mono text-sm">X402_ASSET=usdc</code> in .env).
        </p>
        <CodeBlock lang="bash" code={SERVER_START} />
        <p className="text-text-muted leading-relaxed">
          Under the hood, the server uses <code className="text-pink font-mono text-sm">@x402/hedera/exact/facilitator</code> to verify buyer signatures, then submits the transfer transaction to Hedera as its own fee payer. Buyer never pays gas, and the receipt is a real HashScan-inspectable HTS transfer.
        </p>
      </>
    ),
  },
  {
    id: "budgets",
    icon: ShieldCheck,
    title: "Budget Caps",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          Two limits enforced before every signature.{" "}
          <code className="text-pink font-mono text-sm">MAX_PER_CALL</code>{" "}
          rejects a single request above that amount.{" "}
          <code className="text-pink font-mono text-sm">MAX_PER_DAY</code>{" "}
          rejects anything that would push the current UTC day total over the cap.
        </p>
        <p className="text-text-muted leading-relaxed mb-4">
          Both limits are checked in-process before the wallet emits a signature. A runaway loop cannot drain the account even if the agent is confused. The spending report exposes current usage:
        </p>
        <CodeBlock lang="chat" code={`> Show me my spending report.

[Hedwig] spending_report
  Total today:     0.002000 USDC
  Total all time:  0.002000 USDC
  Count today:     2
  Per-call limit:  0.10
  Per-day limit:   20.00`} />
      </>
    ),
  },
  {
    id: "troubleshooting",
    icon: AlertTriangle,
    title: "Troubleshooting",
    content: (
      <>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <p className="text-text font-semibold text-sm mb-2">"Plug icon does not show hedwig"</p>
            <p className="text-text-muted text-sm leading-relaxed">
              Config file was not read, or Claude Desktop was not fully quit before reopening. Right-click the tray icon and choose Quit. Wait five seconds. Reopen. Then check the plug icon on a new chat. Path in the config uses double-backslashes on Windows, single forward-slashes on macOS.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <p className="text-text font-semibold text-sm mb-2">"DEADLINE_EXCEEDED on gRPC"</p>
            <p className="text-text-muted text-sm leading-relaxed">
              Cross-region traffic to a testnet consensus node timed out. Balance queries already route through Mirror Node REST to sidestep this. Transactions use a 30-second gRPC deadline with retry-with-backoff. If it still fails, retry, or check whether you are behind a VPN blocking outbound to Hedera nodes.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <p className="text-text font-semibold text-sm mb-2">"invalid_exact_hedera_payload_preflight_failed"</p>
            <p className="text-text-muted text-sm leading-relaxed">
              The buyer account has zero balance of the asset being charged. Fund it. For testnet HBAR use the Portal faucet. For testnet USDC use Circle's faucet at{" "}
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="text-pink hover:underline">faucet.circle.com</a>{" "}and select Hedera Testnet.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <p className="text-text font-semibold text-sm mb-2">"HashScan link says invalid transaction id"</p>
            <p className="text-text-muted text-sm leading-relaxed">
              HashScan URL format requires all-dashes between account, seconds, and nanoseconds. Hedwig emits the correct format. If you see the error, refresh the page (indexing lag is under a minute on testnet).
            </p>
          </div>
        </div>
      </>
    ),
  },
];

export function Docs() {
  const [activeSection, setActiveSection] = useState("quickstart");

  return (
    <main className="pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="font-pixel text-lg md:text-xl text-text leading-relaxed">Documentation</h1>
          <p className="mt-4 text-text-muted text-lg max-w-2xl">
            Everything you need to run Hedwig as an autonomous Hedera wallet inside your favorite MCP host.
          </p>
        </motion.div>

        <div className="flex gap-8">
          <nav className="hidden lg:block w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
            <ul className="space-y-1">
              {sections.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => {
                        setActiveSection(s.id);
                        document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        activeSection === s.id
                          ? "bg-pink-dim text-pink"
                          : "text-text-muted hover:text-text hover:bg-bg-card"
                      }`}
                    >
                      <Icon size={14} strokeWidth={1.5} />
                      {s.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex-1 min-w-0">
            {sections.map((s, i) => (
              <motion.section
                key={s.id}
                id={s.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                onViewportEnter={() => setActiveSection(s.id)}
                className="mb-16 scroll-mt-28"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-dim to-purple-dim flex items-center justify-center border border-border">
                    <s.icon size={14} className="text-pink" strokeWidth={1.5} />
                  </div>
                  <h2 className="font-pixel text-xs md:text-sm text-text">{s.title}</h2>
                  <ChevronRight size={14} className="text-text-muted" />
                </div>
                <div className="pl-0 lg:pl-0">{s.content}</div>
              </motion.section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
