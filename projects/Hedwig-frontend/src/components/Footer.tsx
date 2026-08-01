import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { GITHUB_REPO_URL } from "../config/site";

function GithubIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-bg-footer border-t border-border/50 py-5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="font-pixel text-xs gradient-text opacity-80">HEDWIG</span>
          </Link>

          <div className="flex items-center gap-6 text-xs text-text-muted">
            <Link to="/docs" className="hover:text-pink transition-colors">Docs</Link>
            <a
              href="https://docs.x402.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-pink transition-colors"
            >
              x402 Protocol
              <ExternalLink size={10} />
            </a>
            <a
              href="https://hashscan.io/testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-pink transition-colors"
            >
              HashScan
              <ExternalLink size={10} />
            </a>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-pink transition-colors"
            >
              <GithubIcon size={12} />
              Source
            </a>
          </div>

          <p className="text-[10px] text-text-muted/40 font-mono">
            x402 payment protocol on Hedera
          </p>
        </div>
      </div>
    </footer>
  );
}
