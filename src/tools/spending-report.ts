import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { SpendingTracker } from '@/spending.js'

export function registerSpendingReport(
  server: McpServer,
  spending: SpendingTracker
): void {
  server.tool(
    'spending_report',
    'Return the current session\'s USDC spending summary, budget caps, and full history of x402 payments and transfers.',
    {},
    async () => {
      const summary = spending.summary()
      const history = spending.history()

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                summary,
                history: history.slice(-25),
                totalRecords: history.length
              },
              null,
              2
            )
          }
        ]
      }
    }
  )
}
