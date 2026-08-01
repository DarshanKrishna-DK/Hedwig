import type { HederaNetwork } from '@/types.js'

const MIRROR_NODE_URL: Record<HederaNetwork, string> = {
  'hedera-testnet': 'https://testnet.mirrornode.hedera.com',
  'hedera-mainnet': 'https://mainnet-public.mirrornode.hedera.com'
}

export interface MirrorBalance {
  hbarTinybars: bigint
  tokens: Record<string, bigint>
  isAssociatedWith(tokenId: string): boolean
}

/**
 * Query an account's HBAR + HTS token balances via the Hedera Mirror Node
 * REST API. This is the recommended source for balance data - the consensus
 * node gRPC path is unreliable, particularly for cross-region traffic.
 */
export async function fetchAccountBalance(
  accountId: string,
  network: HederaNetwork
): Promise<MirrorBalance> {
  const url = `${MIRROR_NODE_URL[network]}/api/v1/accounts/${accountId}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  let res: Response
  try {
    res = await fetch(url, { signal: controller.signal })
  } catch (err) {
    throw new Error(
      `Mirror Node request to ${url} failed: ${err instanceof Error ? err.message : String(err)}`
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    throw new Error(`Mirror Node returned ${res.status}: ${await res.text()}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json()
  const hbarTinybars = BigInt(data?.balance?.balance ?? 0)
  const tokens: Record<string, bigint> = {}
  for (const t of data?.balance?.tokens ?? []) {
    if (t?.token_id) tokens[t.token_id] = BigInt(t.balance ?? 0)
  }

  return {
    hbarTinybars,
    tokens,
    isAssociatedWith(tokenId: string) {
      return tokenId in tokens
    }
  }
}

export function formatHbar(tinybars: bigint): string {
  const div = 100_000_000n
  const whole = tinybars / div
  const frac = tinybars % div
  return `${whole}.${frac.toString().padStart(8, '0')} ℏ`
}

export function formatUsdc(atomic: bigint): string {
  const d = 6
  const div = BigInt(10 ** d)
  const whole = atomic / div
  const frac = atomic % div
  return `${whole}.${frac.toString().padStart(d, '0')}`
}
