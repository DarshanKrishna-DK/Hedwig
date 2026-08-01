import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AppConfig } from '@/types.js'
import { hashScanBase } from '@/hedera.js'

export function registerRequestFunding(server: McpServer, config: AppConfig): void {
  server.tool(
    'request_funding',
    'Return a fundable receiving address for the configured Hedera account, plus a testnet faucet link (testnet only).',
    {},
    async () => {
      if (!config.accountId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No wallet configured. Set HEDERA_ACCOUNT_ID.'
            }
          ],
          isError: true
        }
      }

      const explorer = `${hashScanBase(config.network)}/account/${config.accountId}`

      const isTestnet = config.network === 'hedera-testnet'
      const faucet = isTestnet
        ? {
            hbar: 'https://portal.hedera.com (create a testnet account to receive 1000 HBAR)',
            note: 'Testnet USDC is not distributed via faucet. Ask an existing testnet holder or bridge from another testnet.'
          }
        : { note: 'No faucet on mainnet.' }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                accountId: config.accountId,
                network: config.network,
                explorer,
                faucet
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
