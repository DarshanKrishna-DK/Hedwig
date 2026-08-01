import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AppConfig } from '@/types.js'
import { getHederaClient, txExplorerUrl } from '@/hedera.js'

export function registerTransferHbar(server: McpServer, config: AppConfig): void {
  server.tool(
    'transfer_hbar',
    'Send HBAR from the configured account to another Hedera account. Amount is in HBAR (e.g. "0.5"), not tinybars.',
    {
      recipient: z
        .string()
        .describe('Recipient Hedera account ID, e.g. "0.0.12345"'),
      amount: z.string().describe('HBAR amount as decimal string, e.g. "0.5"'),
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
        const { TransferTransaction, Hbar, AccountId } = await import(
          '@hiero-ledger/sdk'
        )
        const { client, operatorId } = await getHederaClient(config)

        const to = AccountId.fromString(recipient)
        const amt = Hbar.fromString(amount)

        const tx = new TransferTransaction()
          .addHbarTransfer(operatorId, amt.negated())
          .addHbarTransfer(to, amt)

        if (memo) tx.setTransactionMemo(memo.slice(0, 100))

        const submit = await tx.execute(client)
        const receipt = await submit.getReceipt(client)
        const txId = submit.transactionId.toString()

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: receipt.status.toString(),
                  from: operatorId.toString(),
                  to: to.toString(),
                  amount: `${amount} HBAR`,
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
              text: `HBAR transfer failed: ${err instanceof Error ? err.message : String(err)}`
            }
          ],
          isError: true
        }
      }
    }
  )
}
