import { motion } from "framer-motion";
import { Copy, ArrowRight } from "lucide-react";
import { useState } from "react";
import { GITHUB_REPO_URL } from "../config/site";

const mcpConfig = `// %APPDATA%\\Claude\\claude_desktop_config.json

{
  "mcpServers": {
    "hedwig": {
      "command": "node",
      "args": ["C:/path/to/hedwig/dist/index.js"],
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

const chatPrompts = `> Check my Hedera balance.

[Hedwig] check_balance
  HBAR: 993.39971112
  USDC: 19.999000
  Account: 0.0.6886052

> Fetch http://localhost:4021/premium/quote and
  pay in USDC if it charges.

[Hedwig] x402_fetch
  402 Payment Required detected
  Amount: 0.001 USDC
  Recipient: 0.0.9865777
  Budget check: PASS
  Signing USDC transfer...
  Retrying with payment-signature header
  200 OK - settled on Hedera

  Quote: "The best time to plant a tree was
  20 years ago. The second best time is now."
  HashScan: https://hashscan.io/testnet/tx/...

> Show me my spending report.

[Hedwig] spending_report
  Today: 0.002 USDC / 20.00 cap
  Session: 3 signed payments`;

export function CodeExample() {
  const [tab, setTab] = useState<"mcp" | "chat">("mcp");
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(tab === "mcp" ? mcpConfig : chatPrompts);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section id="code" className="py-24 md:py-32 border-t border-border/50">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="font-pixel text-sm md:text-base text-text-muted tracking-widest uppercase">
            Developer Experience
          </h2>
          <p className="mt-4 text-2xl md:text-3xl font-bold text-text">
            One config,{" "}
            <span className="gradient-text">every agent host</span>
          </p>
          <p className="mt-3 text-text-muted text-base max-w-xl mx-auto">
            Drop the MCP block into Claude Desktop, Cursor, or any MCP-capable
            client. Then talk to your agent like it already had a wallet.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-xl border border-border bg-bg-card overflow-hidden"
          style={{
            boxShadow: "0 30px 60px rgba(0,0,0,0.3), 0 0 80px rgba(245,160,177,0.03)",
          }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-[#080808]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTab("mcp")}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                  tab === "mcp"
                    ? "bg-pink-dim text-pink"
                    : "text-text-muted hover:text-text"
                }`}
              >
                MCP config
              </button>
              <button
                onClick={() => setTab("chat")}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                  tab === "chat"
                    ? "bg-purple-dim text-purple"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Chat transcript
              </button>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors"
            >
              <Copy size={12} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <pre className="p-5 overflow-x-auto text-sm leading-relaxed font-mono">
            <code>
              {(tab === "mcp" ? mcpConfig : chatPrompts).split("\n").map((line, i) => (
                <div key={i} className="flex">
                  <span className="select-none text-text-muted/20 w-7 text-right mr-4 shrink-0 text-xs">
                    {i + 1}
                  </span>
                  <span className="text-text-muted">{line}</span>
                </div>
              ))}
            </code>
          </pre>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 text-center"
        >
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 text-sm text-text-muted hover:text-pink transition-colors"
          >
            View source on GitHub
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
