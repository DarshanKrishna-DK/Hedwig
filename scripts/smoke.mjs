#!/usr/bin/env node
/**
 * Hedwig end-to-end smoke test.
 *
 * Reads HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY from .env and exercises
 * the full flow against Hedera testnet:
 *
 *   1. Query HBAR + USDC balances via Mirror Node REST (reliable HTTP path)
 *   2. Auto-associate with USDC HTS if needed (gRPC, with generous timeout)
 *   3. Send a small HBAR transfer to 0.0.98 (Hedera fee-collect account)
 *   4. Sign an x402 payment header (offline, deterministic)
 *   5. Print every HashScan link ready for the bounty submission
 *
 * gRPC transactions carry a 30-second per-request deadline so cross-region
 * traffic (e.g. India to a random testnet node) doesn't fail the whole run.
 */

import 'dotenv/config'
import {
  Client,
  AccountId,
  TransferTransaction,
  TokenAssociateTransaction,
  TokenId,
  Hbar,
  PrivateKey
} from '@hiero-ledger/sdk'
import { createClientHederaSigner } from '@x402/hedera'
import { x402Client } from '@x402/core/client'
import { ExactHederaScheme } from '@x402/hedera/exact/client'

const USDC_TESTNET = '0.0.429274'
const FEE_COLLECT = '0.0.98'
const HASHSCAN = 'https://hashscan.io/testnet'
const MIRROR = 'https://testnet.mirrornode.hedera.com'

function req(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`\nMissing required env var: ${name}`)
    console.error(`Copy .env.example to .env and fill in your credentials.\n`)
    process.exit(1)
  }
  return v
}

function parseKey(raw) {
  const trimmed = raw.trim().replace(/^0x/, '')
  try { return PrivateKey.fromStringECDSA(trimmed) } catch {}
  try { return PrivateKey.fromStringED25519(trimmed) } catch {}
  return PrivateKey.fromString(trimmed)
}

function txLink(txId) {
  // 0.0.6886052@1785552313.150079732 -> 0.0.6886052-1785552313-150079732
  const [account, timePart = ''] = txId.split('@')
  const [secs = '', nanos = ''] = timePart.split('.')
  return `${HASHSCAN}/transaction/${account}-${secs}-${nanos}`
}

function fmtHbar(tinybars) {
  const div = 100000000n
  const raw = BigInt(tinybars)
  return `${raw / div}.${(raw % div).toString().padStart(8, '0')} ℏ`
}

function fmtUsdc(rawBig) {
  const d = 6
  const div = BigInt(10 ** d)
  const raw = BigInt(rawBig)
  return `${raw / div}.${(raw % div).toString().padStart(d, '0')}`
}

/**
 * Fetch balance via Mirror Node REST. Reliable HTTP path — no gRPC.
 */
async function mirrorBalance(accountId) {
  const url = `${MIRROR}/api/v1/accounts/${accountId}`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`Mirror Node ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const hbar = BigInt(data?.balance?.balance ?? 0)
    const tokens = {}
    for (const t of data?.balance?.tokens ?? []) {
      if (t?.token_id) tokens[t.token_id] = BigInt(t.balance ?? 0)
    }
    return { hbar, tokens }
  } finally {
    clearTimeout(t)
  }
}

async function submitWithRetry(label, fn, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`      Attempt ${i}/${attempts} failed: ${msg.split('\n')[0]}`)
      if (i === attempts) throw err
      await new Promise(r => setTimeout(r, 2000 * i))
    }
  }
}

async function main() {
  console.log('┌──────────────────────────────────────────────────────────┐')
  console.log('│  Hedwig smoke test - Hedera testnet                     │')
  console.log('└──────────────────────────────────────────────────────────┘\n')

  const accountId = req('HEDERA_ACCOUNT_ID')
  const rawKey = req('HEDERA_PRIVATE_KEY')

  const operatorId = AccountId.fromString(accountId)
  const operatorKey = parseKey(rawKey)

  // Client with generous timeouts for cross-region gRPC.
  const client = Client.forTestnet()
    .setOperator(operatorId, operatorKey)
    .setRequestTimeout(30000)

  const links = []

  // ── 1. Balances via Mirror Node ───────────────────────────────────────
  console.log('[1/4] Checking balances via Mirror Node...')
  let bal
  try {
    bal = await mirrorBalance(accountId)
    console.log(`      HBAR: ${fmtHbar(bal.hbar)}`)
    const usdcRaw = bal.tokens[USDC_TESTNET]
    console.log(`      USDC: ${usdcRaw !== undefined ? fmtUsdc(usdcRaw) : 'not associated'}\n`)
  } catch (err) {
    console.error(`      Mirror Node lookup failed: ${err.message}`)
    console.error('      Check your account ID or network connectivity and retry.\n')
    process.exit(1)
  }

  const isAssociated = bal.tokens[USDC_TESTNET] !== undefined

  // ── 2. Auto-associate USDC if needed ──────────────────────────────────
  if (!isAssociated) {
    console.log('[2/4] Associating account with USDC HTS token...')
    try {
      const assoc = await submitWithRetry('token associate', async () => {
        const submit = await new TokenAssociateTransaction()
          .setAccountId(operatorId)
          .setTokenIds([TokenId.fromString(USDC_TESTNET)])
          .setGrpcDeadline(30000)
          .execute(client)
        const receipt = await submit.getReceipt(client)
        return { submit, receipt }
      })
      const txId = assoc.submit.transactionId.toString()
      console.log(`      Status:  ${assoc.receipt.status.toString()}`)
      console.log(`      Tx ID:   ${txId}`)
      console.log(`      Link:    ${txLink(txId)}\n`)
      links.push({ step: 'USDC token association', url: txLink(txId) })
    } catch (err) {
      console.log(`      Skipped: ${err.message}\n`)
    }
  } else {
    console.log('[2/4] Already associated with USDC. Skipping.\n')
  }

  // ── 3. Real on-chain HBAR transfer ────────────────────────────────────
  console.log('[3/4] Sending 0.01 HBAR to Hedera fee-collect account 0.0.98...')
  const hbarResult = await submitWithRetry('hbar transfer', async () => {
    const submit = await new TransferTransaction()
      .addHbarTransfer(operatorId, Hbar.fromString('-0.01'))
      .addHbarTransfer(AccountId.fromString(FEE_COLLECT), Hbar.fromString('0.01'))
      .setTransactionMemo('hedwig smoke test - HBAR transfer')
      .setGrpcDeadline(30000)
      .execute(client)
    const receipt = await submit.getReceipt(client)
    return { submit, receipt }
  })
  const hbarTxId = hbarResult.submit.transactionId.toString()
  console.log(`      Status:  ${hbarResult.receipt.status.toString()}`)
  console.log(`      Tx ID:   ${hbarTxId}`)
  console.log(`      Link:    ${txLink(hbarTxId)}\n`)
  links.push({ step: 'HBAR transfer (0.01 HBAR)', url: txLink(hbarTxId) })

  // ── 4. x402 payment signature (offline, deterministic) ────────────────
  console.log('[4/4] Signing an x402 payment authorization (offline)...')
  const signer = createClientHederaSigner(accountId, operatorKey, {
    network: 'hedera:testnet'
  })
  const x402 = new x402Client()
  x402.register('hedera:*', new ExactHederaScheme(signer))

  const paymentRequired = {
    x402Version: 2,
    error: '',
    resource: { url: 'https://example.com/paid-quote', description: '', mimeType: '' },
    accepts: [
      {
        scheme: 'exact',
        network: 'hedera:testnet',
        asset: USDC_TESTNET,
        amount: '10000', // 0.01 USDC atomic
        payTo: FEE_COLLECT,
        maxTimeoutSeconds: 300,
        extra: { feePayer: FEE_COLLECT }
      }
    ]
  }

  try {
    const payload = await x402.createPaymentPayload(paymentRequired)
    const headers = x402.encodePaymentSignatureHeader(payload)
    const [[name, value]] = Object.entries(headers)
    console.log(`      Header name:   ${name}`)
    console.log(`      Header value:  ${String(value).slice(0, 48)}...`)
    console.log(`      Amount:        0.01 USDC`)
    console.log(`      To:            ${FEE_COLLECT}\n`)
  } catch (err) {
    console.log(`      Signature failed: ${err.message}\n`)
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('┌──────────────────────────────────────────────────────────┐')
  console.log('│  Submission-ready HashScan links                        │')
  console.log('└──────────────────────────────────────────────────────────┘')
  for (const { step, url } of links) {
    console.log(`  - ${step}\n    ${url}`)
  }
  console.log(`\n  Account explorer: ${HASHSCAN}/account/${accountId}\n`)

  client.close()
}

main().catch((err) => {
  console.error('\nSmoke test failed:', err)
  process.exit(1)
})
