import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AppConfig } from '@/types.js'
import { USDC_TOKEN_ID, hashScanBase } from '@/hedera.js'
import { fetchAccountBalance, formatHbar, formatUsdc } from '@/mirror.js'

export function registerCheckBalance(server: McpServer, config: AppConfig): void {
  server.tool(
    'check_balance',
    'Return HBAR and USDC balances for the configured Hedera account, plus a HashScan link. Reads from the Hedera Mirror Node REST API for reliability.',
    {},
    async () => {
      if (!config.accountId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No wallet configured. Set HEDERA_ACCOUNT_ID environment variable.'
            }
          ],
          isError: true
        }
      }

      try {
        const balance = await fetchAccountBalance(config.accountId, config.network)
        const usdcTokenId = USDC_TOKEN_ID[config.network]
        const usdcRaw = balance.tokens[usdcTokenId]

        const usdc = usdcRaw !== undefined
          ? formatUsdc(usdcRaw)
          : '0.000000 (not associated with USDC)'

        const explorer = `${hashScanBase(config.network)}/account/${config.accountId}`

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  accountId: config.accountId,
                  network: config.network,
                  hbar: formatHbar(balance.hbarTinybars),
                  usdc,
                  usdcTokenId,
                  associatedWithUsdc: balance.isAssociatedWith(usdcTokenId),
                  explorer
                },
                null,
                2
              )
            }
          ]
        }
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Balance query failed: ${err instanceof Error ? err.message : String(err)}`
            }
          ],
          isError: true
        }
      }
    }
  )
}

// Keep zod import happy for future extension
export const _z = z
