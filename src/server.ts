import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AppConfig } from '@/types.js'
import { SpendingTracker } from '@/spending.js'
import { registerCheckBalance } from '@/tools/check-balance.js'
import { registerTransferHbar } from '@/tools/transfer-hbar.js'
import { registerTransferUsdc } from '@/tools/transfer-usdc.js'
import { registerPay } from '@/tools/pay.js'
import { registerX402Fetch } from '@/tools/x402-fetch.js'
import { registerSpendingReport } from '@/tools/spending-report.js'
import { registerRequestFunding } from '@/tools/request-funding.js'

export function createMcpServer(config: AppConfig): McpServer {
  const server = new McpServer({
    name: 'hedwig-wallet',
    version: '0.1.0'
  })

  const spending = new SpendingTracker(config.budget)

  // Core wallet
  registerCheckBalance(server, config)
  registerTransferHbar(server, config)
  registerTransferUsdc(server, config, spending)

  // x402
  registerPay(server, config, spending)
  registerX402Fetch(server, config, spending)

  // Budget and funding
  registerSpendingReport(server, spending)
  registerRequestFunding(server, config)

  return server
}
