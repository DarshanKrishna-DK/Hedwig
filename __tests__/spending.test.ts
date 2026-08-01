import { describe, it, expect } from 'vitest'
import { SpendingTracker } from '@/spending.js'

describe('SpendingTracker', () => {
  it('records payments and reports totals', () => {
    const t = new SpendingTracker({ maxPerCall: '1.00', maxPerDay: '5.00' })
    t.check('0.10')
    t.record('0.10', '0.0.12345')
    t.check('0.20')
    t.record('0.20', '0.0.67890')

    const s = t.summary()
    expect(s.totalToday).toBe('0.300000')
    expect(s.countToday).toBe(2)
    expect(s.perCallLimit).toBe('1.00')
  })

  it('rejects amounts above the per-call cap', () => {
    const t = new SpendingTracker({ maxPerCall: '0.05', maxPerDay: '10.00' })
    expect(() => t.check('0.10')).toThrow(/per-call cap/)
  })

  it('rejects amounts that would exceed the daily cap', () => {
    const t = new SpendingTracker({ maxPerCall: '5.00', maxPerDay: '1.00' })
    t.check('0.60')
    t.record('0.60', '0.0.12345')
    expect(() => t.check('0.50')).toThrow(/daily cap/)
  })

  it('rejects invalid decimal strings', () => {
    const t = new SpendingTracker({ maxPerCall: '1.00', maxPerDay: '10.00' })
    expect(() => t.check('not-a-number')).toThrow()
    expect(() => t.check('-1.00')).toThrow()
  })
})
