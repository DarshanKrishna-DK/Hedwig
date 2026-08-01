import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AppConfig } from '@/types.js'
import type { SpendingTracker } from '@/spending.js'
import { createX402HttpClient, getCaip2Network, USDC_TOKEN_ID } from '@/hedera.js'

const USDC_DECIMALS = 6

export function registerPay(
  server: McpServer,
  config: AppConfig,
  spending: SpendingTracker
): void {
  server.tool(
    'pay',
    'Sign an x402 payment authorization for a USDC transfer on Hedera. Returns the header value your HTTP client should attach when retrying the paid request.',
    {
      amount: z.string().describe('USDC amount as decimal string, e.g. "0.05"'),
      recipient: z
        .string()
        .describe('Recipient Hedera account ID, e.g. "0.0.12345"'),
      feePayer: z
        .string()
        .optional()
        .describe(
          'Hedera account that will pay the HBAR gas fee to submit this transfer. Defaults to the recipient.'
        ),
      resource: z
        .string()
        .optional()
        .describe('URL of the resource being paid for (from the 402 challenge)')
    },
    async ({ amount, recipient, feePayer, resource }) => {
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

        const httpClient = await createX402HttpClient(config)
        const caip2 = getCaip2Network(config.network)
        const asset = USDC_TOKEN_ID[config.network]

        const paymentRequired = {
          x402Version: 2,
          error: '',
          resource: {
            url: resource ?? '',
            description: '',
            mimeType: ''
          },
          accepts: [
            {
              scheme: 'exact',
              network: caip2,
              asset,
              amount: toAtomicString(amount),
              payTo: recipient,
              maxTimeoutSeconds: 300,
              extra: { feePayer: feePayer ?? recipient }
            }
          ]
        }

        const payload = await httpClient.createPaymentPayload(paymentRequired)
        const signatureHeaders = httpClient.encodePaymentSignatureHeader(payload)

        if (!signatureHeaders || Object.keys(signatureHeaders).length === 0) {
          throw new Error('Failed to generate payment header')
        }

        spending.record(amount, recipient, resource)

        const [[headerName, headerValue]] = Object.entries(signatureHeaders)

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  paymentHeader: headerValue,
                  headerName,
                  amount: `${amount} USDC`,
                  recipient,
                  network: config.network,
                  resource: resource ?? null,
                  hint: `Attach header "${headerName}: ${String(headerValue).slice(0, 24)}..." to retry the request.`
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
              text: `Payment signing failed: ${err instanceof Error ? err.message : String(err)}`
            }
          ],
          isError: true
        }
      }
    }
  )
}

function toAtomicString(amount: string): string {
  const parts = amount.split('.')
  const whole = parts[0] || '0'
  const frac = (parts[1] || '').padEnd(USDC_DECIMALS, '0').slice(0, USDC_DECIMALS)
  return (
    BigInt(whole) * BigInt(10 ** USDC_DECIMALS) +
    BigInt(frac)
  ).toString()
}
