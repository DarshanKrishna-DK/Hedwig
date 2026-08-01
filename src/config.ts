import type { HederaNetwork, AppConfig } from '@/types.js'

export function loadConfig(): AppConfig {
  const state = buildState()
  return {
    ...state,
    reload() {
      const fresh = buildState()
      Object.assign(this, fresh)
    }
  }
}

function buildState(): Omit<AppConfig, 'reload'> {
  const accountId = process.env.HEDERA_ACCOUNT_ID ?? undefined
  const privateKey = process.env.HEDERA_PRIVATE_KEY ?? undefined
  const network = (process.env.NETWORK ?? 'hedera-testnet') as HederaNetwork

  if (network !== 'hedera-testnet' && network !== 'hedera-mainnet') {
    throw new Error(
      `Invalid NETWORK "${network}". Use "hedera-testnet" or "hedera-mainnet".`
    )
  }

  const maxPerCall = process.env.MAX_PER_CALL ?? '0.10'
  const maxPerDay = process.env.MAX_PER_DAY ?? '20.00'

  const canPay = !!(accountId && privateKey)

  return {
    accountId,
    privateKey,
    network,
    budget: { maxPerCall, maxPerDay },
    canPay
  }
}
