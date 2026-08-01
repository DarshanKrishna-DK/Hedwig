import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AppConfig } from '@/types.js'
import type { SpendingTracker } from '@/spending.js'
import { getHederaClient, txExplorerUrl, USDC_TOKEN_ID } from '@/hedera.js'

const USDC_DECIMALS = 6

export function registerTransferUsdc(
  server: McpServer,
  config: AppConfig,
  spending: SpendingTracker
): void {
  server.tool(
    'transfer_usdc',
    'Send USDC (HTS token) from the configured account to another Hedera account. Both accounts must be associated with the USDC token.',
    {
      recipient: z
        .string()
        .describe('Recipient Hedera account ID, e.g. "0.0.12345"'),
      amount: z.string().describe('USDC amount as decimal string, e.g. "0.05"'),
      memo: z.string().optional().describe('Optional transaction memo (max 100 chars)')
    },
    async ({ recipient, amount, memo }) => {
      if (!config.canPay) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No wallet configured. Set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY.'
            }
          ],
          isError: true
        }
      }

      try {
        spending.check(amount)

        const { TransferTransaction, TokenId, AccountId } = await import(
          '@hiero-ledger/sdk'
        )
        const { client, operatorId } = await getHederaClient(config)

        const tokenId = TokenId.fromString(USDC_TOKEN_ID[config.network])
        const to = AccountId.fromString(recipient)
        const atomic = toAtomic(amount)

        const tx = new TransferTransaction()
          .addTokenTransfer(tokenId, operatorId, -atomic)
          .addTokenTransfer(tokenId, to, atomic)

        if (memo) tx.setTransactionMemo(memo.slice(0, 100))

        const submit = await tx.execute(client)
        const receipt = await submit.getReceipt(client)
        const txId = submit.transactionId.toString()

        spending.record(amount, recipient, memo)

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: receipt.status.toString(),
                  from: operatorId.toString(),
                  to: to.toString(),
                  amount: `${amount} USDC`,
                  tokenId: tokenId.toString(),
                  memo: memo ?? null,
                  transactionId: txId,
                  explorer: txExplorerUrl(config.network, txId)
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
              text: `USDC transfer failed: ${err instanceof Error ? err.message : String(err)}`
            }
          ],
          isError: true
        }
      }
    }
  )
}

function toAtomic(amount: string): number {
  const parts = amount.split('.')
  const whole = parts[0] || '0'
  const frac = (parts[1] || '').padEnd(USDC_DECIMALS, '0').slice(0, USDC_DECIMALS)
  const value = BigInt(whole) * BigInt(10 ** USDC_DECIMALS) + BigInt(frac)
  // HTS transfers use int64; safe to Number-cast for our micropayment range.
  return Number(value)
}
