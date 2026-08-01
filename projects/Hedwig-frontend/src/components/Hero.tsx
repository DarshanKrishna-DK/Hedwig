import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { HeroTerminal } from "./HeroTerminal";

export function Hero() {
  return (
    <section id="hero" className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-pink/[0.03] blur-[150px] pointer-events-none" />
      <div className="absolute top-20 right-1/4 w-[500px] h-[500px] rounded-full bg-purple/[0.03] blur-[150px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1 className="font-pixel text-xl md:text-2xl lg:text-3xl leading-relaxed tracking-wide">
              <span className="text-text">The wallet</span>
              <br />
              <span className="text-text">for </span>
              <span className="gradient-text">autonomous</span>
              <br />
              <span className="gradient-text">agents</span>
            </h1>

            <p className="mt-6 text-base md:text-lg text-text-muted leading-relaxed max-w-lg">
              Hedwig gives AI agents a Hedera wallet they can drive themselves.
              It intercepts HTTP{" "}
              <code className="text-pink font-mono text-sm px-1.5 py-0.5 rounded bg-pink-dim">402</code>{" "}
              responses, signs HBAR or USDC micropayments, and retries with
              proof of settlement. Ships as an MCP server for Claude Desktop,
              Cursor, and any host that speaks the protocol.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="/docs"
                className="group flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink to-purple px-6 py-3 text-sm font-semibold text-bg hover:opacity-90 transition-opacity"
              >
                <Zap size={16} />
                Get Started
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#how-it-works"
                className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-text-muted hover:text-text hover:border-border-hover transition-all"
              >
                Read the protocol
              </a>
            </div>

            <div className="mt-6 flex items-center gap-6 text-xs text-text-muted font-mono">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pink" />
                Hedera native
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple" />
                x402 protocol
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Open source
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
            className="relative flex justify-center lg:justify-end min-w-0"
          >
            <HeroTerminal />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
