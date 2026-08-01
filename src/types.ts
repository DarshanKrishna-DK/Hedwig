export type HederaNetwork = 'hedera-testnet' | 'hedera-mainnet'

export interface BudgetConfig {
  maxPerCall: string
  maxPerDay: string
}

export interface AppConfig {
  accountId?: string
  privateKey?: string
  network: HederaNetwork
  budget: BudgetConfig
  canPay: boolean
  reload(): void
}

export interface SpendingRecord {
  recipient: string
  amount: string
  timestamp: string
  memo?: string
}
