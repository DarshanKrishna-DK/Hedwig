import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GITHUB_REPO_URL } from "../config/site";

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  function handleLogoClick(e: React.MouseEvent) {
    e.preventDefault();
    if (isHome) {
      document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
    }
  }

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-bg/60 backdrop-blur-2xl"
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
        <a href="/" onClick={handleLogoClick} className="flex items-center gap-3">
          <span className="font-pixel text-sm gradient-text">HEDWIG</span>
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm text-text-muted font-medium">
          {isHome ? (
            <>
              <a href="#features" className="hover:text-pink transition-colors duration-200">Features</a>
              <a href="#how-it-works" className="hover:text-pink transition-colors duration-200">Protocol</a>
              <a href="#code" className="hover:text-pink transition-colors duration-200">MCP</a>
            </>
          ) : (
            <Link to="/" className="hover:text-pink transition-colors duration-200">Home</Link>
          )}
          <Link to="/docs" className={`hover:text-pink transition-colors duration-200 ${location.pathname === "/docs" ? "text-pink" : ""}`}>Docs</Link>
        </div>

        <div className="flex items-center gap-4">
          <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors">
            <GithubIcon size={16} />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <Link to="/docs" className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink to-purple px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 transition-opacity">
            <Terminal size={14} />
            Get Started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
