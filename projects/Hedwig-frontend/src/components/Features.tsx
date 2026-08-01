import { motion } from "framer-motion";
import {
  Wallet,
  Coins,
  RefreshCcw,
  ShieldCheck,
  Plug,
  ScrollText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: Wallet,
    title: "Native HBAR + USDC",
    description:
      "Send Hedera native currency or Circle-issued USDC (HTS token 0.0.429274) with a single tool call. Real HTS transfers, no bridges, no wrappers.",
    color: "text-pink",
  },
  {
    icon: Coins,
    title: "x402 Autopay",
    description:
      "Full HTTP 402 flow implemented for Hedera. Agent hits a paywall, wallet signs USDC transfer, request retries with proof of payment. No wallet popup.",
    color: "text-purple",
  },
  {
    icon: ShieldCheck,
    title: "Budget Caps",
    description:
      "Two hard limits enforced before every signature: per-call and per-UTC-day. A runaway agent cannot drain your account. Configurable through env vars.",
    color: "text-pink",
  },
  {
    icon: Plug,
    title: "MCP Native",
    description:
      "Seven tools exposed over stdio JSON-RPC. Works with Claude Desktop, Cursor, Windsurf, and any host that speaks the Model Context Protocol.",
    color: "text-purple",
  },
  {
    icon: RefreshCcw,
    title: "Fast + Reliable",
    description:
      "Balance queries via Hedera Mirror Node REST (never times out on gRPC), transactions with 30-second gRPC deadline and retry-with-backoff. Cross-region safe.",
    color: "text-pink",
  },
  {
    icon: ScrollText,
    title: "Full Audit Trail",
    description:
      "Every signed payment recorded with amount, recipient, timestamp, and resource URL. Spending report tool exposes session totals and rolling history.",
    color: "text-purple",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function Features() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-pixel text-sm md:text-base text-text-muted tracking-widest uppercase">
            Capabilities
          </h2>
          <p className="mt-4 text-2xl md:text-3xl font-bold text-text">
            Everything an agent needs to{" "}
            <span className="gradient-text">pay on Hedera</span>
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={cardVariants}
                className="card-3d rounded-xl border border-border bg-bg-card p-6 hover:border-border-hover"
              >
                <div className={`${f.color} mb-4`}>
                  <Icon size={22} strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-text mb-2">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
