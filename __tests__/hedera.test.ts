import { describe, it, expect } from 'vitest'
import { USDC_TOKEN_ID, getCaip2Network, hashScanBase, txExplorerUrl } from '@/hedera.js'

describe('hedera helpers', () => {
  it('exposes Circle USDC token IDs for testnet and mainnet', () => {
    expect(USDC_TOKEN_ID['hedera-testnet']).toBe('0.0.429274')
    expect(USDC_TOKEN_ID['hedera-mainnet']).toBe('0.0.456858')
  })

  it('maps networks to CAIP-2 identifiers', () => {
    expect(getCaip2Network('hedera-testnet')).toBe('hedera:testnet')
    expect(getCaip2Network('hedera-mainnet')).toBe('hedera:mainnet')
  })

  it('builds HashScan explorer URLs', () => {
    expect(hashScanBase('hedera-testnet')).toContain('hashscan.io/testnet')
    const url = txExplorerUrl(
      'hedera-testnet',
      '0.0.12345@1754000000.000000000'
    )
    expect(url).toContain('hashscan.io/testnet/transaction/')
    // All-dash format between account, seconds, nanoseconds
    expect(url).toContain('0.0.12345-1754000000-000000000')
  })
})
