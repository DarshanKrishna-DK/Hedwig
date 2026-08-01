// ─── CRITICAL: redirect all console output to stderr ───────────────────────
// MCP servers communicate over stdout via JSON-RPC. Any stray console.log
// corrupts the protocol frames. @hiero-ledger/sdk and other libs occasionally
// log at startup, so we intercept before anything else runs.
const _write = (msg: unknown, ...args: unknown[]) =>
  process.stderr.write(`${[msg, ...args].join(' ')}\n`)
console.log = _write
console.info = _write
console.debug = _write
// console.error and console.warn are already on stderr

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { loadConfig } from '@/config.js'
import { createMcpServer } from '@/server.js'

const config = loadConfig()
const server = createMcpServer(config)
const transport = new StdioServerTransport()
await server.connect(transport)
