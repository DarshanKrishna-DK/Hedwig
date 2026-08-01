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
    'Fetch a URL that may be x402-gated. If the server returns 402, sign a Hedera USDC payment, retry with the payment header, and return the final response body. Includes diagnostic info in the response for debugging.',
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

      // Diagnostic collector — always included in response so caller can debug
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const debug: Record<string, any> = { steps: [] as string[] }

      try {
        debug.steps.push('creating x402 http client')
        const httpClient = await createX402HttpClient(config)
        debug.steps.push('x402 http client ready')

        // ─── First attempt ───────────────────────────────────────────────
        debug.steps.push(`first fetch: ${method} ${url}`)
        const firstResp = await fetch(url, {
          method,
          headers: headers ?? {},
          body
        })
        debug.firstStatus = firstResp.status

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
                    body: truncate(text, 4000),
                    debug
                  },
                  null,
                  2
                )
              }
            ]
          }
        }

        // ─── Parse the 402 challenge ─────────────────────────────────────
        debug.steps.push('parsing 402 challenge')
        const challenge = await firstResp.json()
        debug.challenge = challenge

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
                    ),
                    debug
                  },
                  null,
                  2
                )
              }
            ],
            isError: true
          }
        }

        // ─── Budget check ────────────────────────────────────────────────
        const amountDecimal = fromAtomic(hederaAccept.amount, hederaAccept.asset)
        debug.amount = amountDecimal
        debug.asset = hederaAccept.asset
        spending.check(amountDecimal)

        // ─── Sign the payment ────────────────────────────────────────────
        debug.steps.push('creating payment payload')
        let payload
        try {
          payload = await httpClient.createPaymentPayload(challenge)
          debug.payloadCreated = true
        } catch (signErr) {
          debug.signError = signErr instanceof Error ? signErr.message : String(signErr)
          throw new Error(`createPaymentPayload failed: ${debug.signError}`)
        }

        debug.steps.push('encoding signature header')
        let signatureHeaders
        try {
          signatureHeaders = httpClient.encodePaymentSignatureHeader(payload)
          debug.signatureHeaderKeys = Object.keys(signatureHeaders ?? {})
          debug.signatureHeaderSample = firstEntryPreview(signatureHeaders)
        } catch (encErr) {
          debug.encodeError = encErr instanceof Error ? encErr.message : String(encErr)
          throw new Error(`encodePaymentSignatureHeader failed: ${debug.encodeError}`)
        }

        if (!signatureHeaders || Object.keys(signatureHeaders).length === 0) {
          throw new Error('encodePaymentSignatureHeader returned no headers')
        }

        // ─── Retry with the payment header ───────────────────────────────
        const retryHeaders = {
          ...(headers ?? {}),
          ...(signatureHeaders as Record<string, string>)
        }
        debug.retryHeaderKeys = Object.keys(retryHeaders)
        debug.steps.push(`retry fetch with ${Object.keys(signatureHeaders).join(', ')}`)

        const secondResp = await fetch(url, {
          method,
          headers: retryHeaders,
          body
        })
        debug.secondStatus = secondResp.status
        debug.secondResponseHeaders = Object.fromEntries(secondResp.headers.entries())

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
                  paymentResponse:
                    secondResp.headers.get('payment-response') ??
                    secondResp.headers.get('x-payment-response'),
                  body: truncate(responseText, 4000),
                  debug
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
              text: JSON.stringify(
                {
                  paid: false,
                  error: err instanceof Error ? err.message : String(err),
                  debug
                },
                null,
                2
              )
            }
          ],
          isError: true
        }
      }
    }
  )
}

function fromAtomic(atomic: string | number, asset?: string): string {
  const raw = BigInt(atomic)
  // HBAR (asset id "0.0.0") uses 8 decimals (tinybars). HTS tokens like USDC use 6.
  const decimals = asset === '0.0.0' ? 8 : 6
  const divisor = BigInt(10 ** decimals)
  const whole = raw / divisor
  const frac = raw % divisor
  return `${whole}.${frac.toString().padStart(decimals, '0')}`
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}... [truncated ${s.length - max} chars]` : s
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function firstEntryPreview(headers: any): string | null {
  if (!headers) return null
  const entries = Object.entries(headers)
  if (entries.length === 0) return null
  const [name, value] = entries[0]
  const v = String(value)
  return `${name}: ${v.slice(0, 32)}${v.length > 32 ? '...' : ''}`
}
