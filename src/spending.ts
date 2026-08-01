import type { BudgetConfig, SpendingRecord } from '@/types.js'

export class SpendingTracker {
  private records: SpendingRecord[] = []
  constructor(private readonly budget: BudgetConfig) {}

  /**
   * Pre-flight check before signing. Throws if the amount would exceed
   * per-call or per-day caps. Amounts are decimal USD strings, e.g. "0.05".
   */
  check(amount: string): void {
    const amt = parseDecimal(amount)
    const perCall = parseDecimal(this.budget.maxPerCall)
    const perDay = parseDecimal(this.budget.maxPerDay)

    if (amt > perCall) {
      throw new Error(
        `Amount ${amount} exceeds per-call cap of ${this.budget.maxPerCall} USDC.`
      )
    }

    const spentToday = this.totalSince(startOfUtcDay())
    if (spentToday + amt > perDay) {
      throw new Error(
        `Amount ${amount} would push today's spend (${spentToday.toFixed(6)} USDC) ` +
          `over the daily cap of ${this.budget.maxPerDay} USDC.`
      )
    }
  }

  /**
   * Record a successful payment. Call this after the signature or transfer
   * has been produced.
   */
  record(amount: string, recipient: string, memo?: string): void {
    this.records.push({
      amount,
      recipient,
      timestamp: new Date().toISOString(),
      memo
    })
  }

  history(): SpendingRecord[] {
    return [...this.records]
  }

  summary(): {
    totalToday: string
    totalAllTime: string
    countToday: number
    countAllTime: number
    perCallLimit: string
    perDayLimit: string
  } {
    const dayStart = startOfUtcDay()
    const totalAll = this.totalSince(0)
    const totalToday = this.totalSince(dayStart)
    return {
      totalToday: totalToday.toFixed(6),
      totalAllTime: totalAll.toFixed(6),
      countToday: this.records.filter(
        (r) => Date.parse(r.timestamp) >= dayStart
      ).length,
      countAllTime: this.records.length,
      perCallLimit: this.budget.maxPerCall,
      perDayLimit: this.budget.maxPerDay
    }
  }

  private totalSince(msEpoch: number): number {
    return this.records
      .filter((r) => Date.parse(r.timestamp) >= msEpoch)
      .reduce((acc, r) => acc + parseDecimal(r.amount), 0)
  }
}

function parseDecimal(s: string): number {
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid decimal amount: "${s}"`)
  }
  return n
}

function startOfUtcDay(): number {
  const now = new Date()
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}
