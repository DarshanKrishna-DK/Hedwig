import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AppConfig } from '@/types.js'
import type { SpendingTracker } from '@/spending.js'
import { createX402HttpClient } from '@/hedera.js'

export function registerX402Fetch(
  server: McpServer,
  config: AppConfig,
  spending: SpendingTracker
): void {
  server.tool(
    'x402_fetch',
    'Fetch a URL that may be x402-gated. If the server returns 402, sign a Hedera USDC payment, retry with the payment header, and return the final response body.',
    {
      url: z.string().describe('The URL to fetch (may be x402-gated)'),
      method: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
        .default('GET')
        .describe('HTTP method'),
      headers: z
        .record(z.string())
        .optional()
        .describe('Extra headers to send with the request'),
      body: z.string().optional().describe('Request body, if any (raw string)')
    },
    async ({ url, method, headers, body }) => {
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
        const httpClient = await createX402HttpClient(config)

        // ─── First attempt ───────────────────────────────────────────────
        const firstResp = await fetch(url, {
          method,
          headers: headers ?? {},
          body
        })

        if (firstResp.status !== 402) {
          const text = await firstResp.text()
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    paid: false,
                    status: firstResp.status,
                    contentType: firstResp.headers.get('content-type'),
                    body: truncate(text, 4000)
                  },
                  null,
                  2
                )
              }
            ]
          }
        }

        // ─── Parse the 402 challenge ─────────────────────────────────────
        const challenge = await firstResp.json()
        const accepts = challenge.accepts ?? []
        const hederaAccept = accepts.find((a: { network: string }) =>
          a.network?.startsWith('hedera:')
        )

        if (!hederaAccept) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    paid: false,
                    error: 'Server does not accept Hedera payments',
                    acceptsNetworks: accepts.map(
                      (a: { network: string }) => a.network
                    )
                  },
                  null,
                  2
                )
              }
            ],
            isError: true
          }
        }

        // ─── Budget check (server declared amount is in atomic units) ────
        const amountDecimal = fromAtomic(hederaAccept.amount)
        spending.check(amountDecimal)

        // ─── Sign the payment ────────────────────────────────────────────
        const payload = await httpClient.createPaymentPayload(challenge)
        const signatureHeaders = httpClient.encodePaymentSignatureHeader(payload)

        // ─── Retry with the payment header ───────────────────────────────
        const retryHeaders = {
          ...(headers ?? {}),
          ...(signatureHeaders as Record<string, string>)
        }

        const secondResp = await fetch(url, {
          method,
          headers: retryHeaders,
          body
        })

        const responseText = await secondResp.text()
        const settled = secondResp.status < 400

        if (settled) {
          spending.record(amountDecimal, hederaAccept.payTo, url)
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  paid: settled,
                  amount: `${amountDecimal} USDC`,
                  recipient: hederaAccept.payTo,
                  network: hederaAccept.network,
                  status: secondResp.status,
                  contentType: secondResp.headers.get('content-type'),
                  paymentResponse: secondResp.headers.get('payment-response'),
                  body: truncate(responseText, 4000)
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
              text: `x402_fetch failed: ${err instanceof Error ? err.message : String(err)}`
            }
          ],
          isError: true
        }
      }
    }
  )
}

function fromAtomic(atomic: string | number): string {
  const raw = BigInt(atomic)
  const decimals = 6
  const divisor = BigInt(10 ** decimals)
  const whole = raw / divisor
  const frac = raw % divisor
  return `${whole}.${frac.toString().padStart(decimals, '0')}`
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}... [truncated ${s.length - max} chars]` : s
}
