import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadConfig } from '@/config.js'

describe('loadConfig', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.HEDERA_ACCOUNT_ID
    delete process.env.HEDERA_PRIVATE_KEY
    delete process.env.NETWORK
    delete process.env.MAX_PER_CALL
    delete process.env.MAX_PER_DAY
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('defaults to testnet with no wallet configured', () => {
    const cfg = loadConfig()
    expect(cfg.network).toBe('hedera-testnet')
    expect(cfg.canPay).toBe(false)
    expect(cfg.budget.maxPerCall).toBe('0.10')
    expect(cfg.budget.maxPerDay).toBe('20.00')
  })

  it('reports canPay when both account and key are set', () => {
    process.env.HEDERA_ACCOUNT_ID = '0.0.12345'
    process.env.HEDERA_PRIVATE_KEY = 'deadbeef'
    const cfg = loadConfig()
    expect(cfg.canPay).toBe(true)
  })

  it('rejects unknown networks', () => {
    process.env.NETWORK = 'polygon'
    expect(() => loadConfig()).toThrow(/Invalid NETWORK/)
  })
})
