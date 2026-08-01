import type { HederaNetwork, AppConfig } from '@/types.js'

// ─── USDC token IDs on Hedera (native HTS tokens issued by Circle) ─────────
export const USDC_TOKEN_ID: Record<HederaNetwork, string> = {
  'hedera-testnet': '0.0.429274',
  'hedera-mainnet': '0.0.456858'
}

// ─── CAIP-2 network identifiers used by @x402/hedera ───────────────────────
export function getCaip2Network(network: HederaNetwork): `${string}:${string}` {
  return network === 'hedera-testnet' ? 'hedera:testnet' : 'hedera:mainnet'
}

// ─── HashScan explorer URLs for building tx links ──────────────────────────
export function hashScanBase(network: HederaNetwork): string {
  return network === 'hedera-testnet'
    ? 'https://hashscan.io/testnet'
    : 'https://hashscan.io/mainnet'
}

export function txExplorerUrl(network: HederaNetwork, txId: string): string {
  // Hedera tx IDs come in the form 0.0.12345@1234567890.000000000
  // HashScan expects all-dash format: 0.0.12345-1234567890-000000000
  // (The account ID's own dots stay as dots on HashScan.)
  const [account, timePart = ''] = txId.split('@')
  const [secs = '', nanos = ''] = timePart.split('.')
  return `${hashScanBase(network)}/transaction/${account}-${secs}-${nanos}`
}

// ─── Native Hedera SDK client (for direct transfers, balances) ─────────────
// Lazy import so tests can load types without pulling the whole SDK.
export async function getHederaClient(config: AppConfig) {
  const { Client, PrivateKey, AccountId } = await import('@hiero-ledger/sdk')

  if (!config.accountId || !config.privateKey) {
    throw new Error(
      'Wallet not configured. Set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY.'
    )
  }

  const client =
    config.network === 'hedera-testnet' ? Client.forTestnet() : Client.forMainnet()

  const operatorId = AccountId.fromString(config.accountId)
  const operatorKey = parsePrivateKey(config.privateKey, PrivateKey)
  client.setOperator(operatorId, operatorKey)

  return { client, operatorId, operatorKey }
}

// ─── Private key parsing (accepts both ECDSA and ED25519 hex or DER) ───────
// A MetaMask-exported key looks like a 32-byte hex string starting with 0x.
// A Hedera portal ECDSA key comes as DER-encoded hex. We try ECDSA first
// (MetaMask compatibility) and fall back to ED25519.
type PrivateKeyClass = {
  fromStringECDSA: (s: string) => unknown
  fromStringED25519: (s: string) => unknown
  fromString: (s: string) => unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parsePrivateKey(raw: string, PrivateKey: PrivateKeyClass): any {
  const trimmed = raw.trim().replace(/^0x/, '')

  // Try ECDSA first — this is what MetaMask exports and what most modern
  // Hedera portal accounts use.
  try {
    return PrivateKey.fromStringECDSA(trimmed)
  } catch {
    // Fall through
  }

  try {
    return PrivateKey.fromStringED25519(trimmed)
  } catch {
    // Fall through
  }

  // Last resort: let the SDK autodetect
  return PrivateKey.fromString(trimmed)
}

// ─── Wallet address (Hedera account ID, e.g. "0.0.12345") ──────────────────
export function getWalletAddress(config: AppConfig): string {
  if (!config.accountId) {
    throw new Error('No wallet configured. Set HEDERA_ACCOUNT_ID.')
  }
  return config.accountId
}

// ─── x402 HTTP client for Hedera ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createX402HttpClient(config: AppConfig): Promise<any> {
  if (!config.canPay) {
    throw new Error(
      'Wallet not configured. Set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY.'
    )
  }

  const { x402Client, x402HTTPClient } = await import('@x402/core/client')
  const { ExactHederaScheme } = await import('@x402/hedera/exact/client')
  const hederaMod = await import('@x402/hedera')
  const sdkMod = await import('@hiero-ledger/sdk')

  const createClientHederaSigner = (
    hederaMod as unknown as {
      createClientHederaSigner: (
        accountId: string,
        privateKey: unknown,
        opts: { network: string }
      ) => unknown
    }
  ).createClientHederaSigner

  const parsedKey = parsePrivateKey(config.privateKey!, sdkMod.PrivateKey)
  const caip2 = getCaip2Network(config.network)

  const signer = createClientHederaSigner(config.accountId!, parsedKey, {
    network: caip2
  })

  const client = new x402Client()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.register(`hedera:*`, new ExactHederaScheme(signer as any))

  return new x402HTTPClient(client)
}
