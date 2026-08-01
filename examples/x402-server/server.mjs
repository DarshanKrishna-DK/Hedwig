#!/usr/bin/env node
/**
 * Minimal x402 demo server for Hedera testnet.
 *
 * On first startup, this server auto-creates its own dedicated Hedera
 * account (funded by your operator), associates it with USDC, and saves
 * the credentials to server-account.json in this folder. Subsequent
 * starts reuse that account.
 *
 * This is necessary because the x402 facilitator's verify step checks
 * that the payTo account actually receives `amount` net tokens. A
 * self-transfer between the same account nets to zero and fails verify.
 *
 * Endpoints:
 *   GET /premium/quote   - the paid endpoint (0.001 USDC per call)
 *   GET /health          - liveness check
 *
 * Run:  start-x402-server.bat  or  node examples/x402-server/server.mjs
 */

const log = (...args) => process.stderr.write(`[x402-server] ${args.join(' ')}\n`)

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import {
  Client,
  PrivateKey,
  AccountId,
  AccountCreateTransaction,
  TokenAssociateTransaction,
  TokenId,
  Hbar
} from '@hiero-ledger/sdk'
import {
  toFacilitatorHederaSigner,
  createHederaSignAndSubmitTransaction,
  createHederaVerifyPayerSignature,
  createHederaPreflightTransfer
} from '@x402/hedera'
import { ExactHederaScheme } from '@x402/hedera/exact/facilitator'

// ─── Config ────────────────────────────────────────────────────────────
const operatorAccountId = process.env.HEDERA_ACCOUNT_ID
const operatorRawKey = process.env.HEDERA_PRIVATE_KEY
const PORT = Number(process.env.X402_SERVER_PORT ?? 4021)
const PAYMENT_ASSET = (process.env.X402_ASSET ?? 'hbar').toLowerCase()
const USDC = '0.0.429274'

// Asset config. HBAR is native and needs no association.
// USDC is HTS token 0.0.429274 on testnet and needs buyer to hold a balance.
const ASSETS = {
  hbar: {
    asset: '0.0.0',
    amount: '100000', // 0.001 HBAR (8 decimals: 100_000 tinybars)
    display: '0.001 HBAR',
    label: 'HBAR'
  },
  usdc: {
    asset: USDC,
    amount: '1000', // 0.001 USDC (6 decimals)
    display: '0.001 USDC',
    label: 'USDC'
  }
}

const chosenAsset = ASSETS[PAYMENT_ASSET] ?? ASSETS.hbar

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..', '..')
const ACCOUNT_FILE = path.join(projectRoot, 'server-account.json')

if (!operatorAccountId || !operatorRawKey) {
  log('ERROR: HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in .env')
  process.exit(1)
}

function parseKey(raw) {
  const trimmed = raw.trim().replace(/^0x/, '')
  try { return PrivateKey.fromStringECDSA(trimmed) } catch {}
  try { return PrivateKey.fromStringED25519(trimmed) } catch {}
  return PrivateKey.fromString(trimmed)
}

// ─── Get or create the server's own Hedera account ─────────────────────
async function getOrCreateServerAccount() {
  if (fs.existsSync(ACCOUNT_FILE)) {
    const data = JSON.parse(fs.readFileSync(ACCOUNT_FILE, 'utf8'))
    log(`Using existing server account: ${data.accountId}`)
    return data
  }

  log('First startup detected. Creating dedicated server account...')
  log('(This uses about 6 HBAR from your operator account. One-time cost.)')

  const operatorId = AccountId.fromString(operatorAccountId)
  const operatorKey = parseKey(operatorRawKey)
  const operatorClient = Client.forTestnet()
    .setOperator(operatorId, operatorKey)
    .setRequestTimeout(30000)

  // Generate ECDSA key for the new account
  const newKey = PrivateKey.generateECDSA()

  // Create account with 5 HBAR initial balance
  const createTx = await new AccountCreateTransaction()
    .setKey(newKey.publicKey)
    .setInitialBalance(new Hbar(5))
    .setGrpcDeadline(30000)
    .execute(operatorClient)

  const createReceipt = await createTx.getReceipt(operatorClient)
  const newAccountId = createReceipt.accountId.toString()
  log(`Created server account: ${newAccountId}`)

  operatorClient.close()

  // Associate the new account with USDC (must be signed by the new account)
  const newClient = Client.forTestnet()
    .setOperator(AccountId.fromString(newAccountId), newKey)
    .setRequestTimeout(30000)

  const assocTx = await new TokenAssociateTransaction()
    .setAccountId(AccountId.fromString(newAccountId))
    .setTokenIds([TokenId.fromString(USDC)])
    .setGrpcDeadline(30000)
    .execute(newClient)
  await assocTx.getReceipt(newClient)
  log('Associated server account with USDC')

  newClient.close()

  // Save credentials to disk (single-line JSON so it's easy to inspect)
  const data = {
    accountId: newAccountId,
    privateKey: newKey.toStringDer(),
    createdAt: new Date().toISOString(),
    warning: 'Testnet-only demo credentials. Do not use on mainnet.'
  }
  fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(data, null, 2))
  log(`Saved credentials to ${ACCOUNT_FILE}`)
  log('(This file is git-ignored. Delete it to regenerate the account.)')

  return data
}

// ─── Payment requirements template ─────────────────────────────────────
function buildRequirements(resourceUrl, serverAccountId) {
  return {
    scheme: 'exact',
    network: 'hedera:testnet',
    asset: chosenAsset.asset,
    amount: chosenAsset.amount,
    payTo: serverAccountId,
    resource: resourceUrl,
    description: 'Premium wisdom quote endpoint',
    mimeType: 'application/json',
    maxTimeoutSeconds: 300,
    extra: { feePayer: serverAccountId }
  }
}

// ─── Premium content ───────────────────────────────────────────────────
const QUOTES = [
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese proverb' },
  { text: 'What we know is a drop, what we do not know is an ocean.', author: 'Isaac Newton' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'In the middle of every difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'The x402 protocol makes machine-to-machine payments a first-class HTTP operation.', author: 'Coinbase, 2025' }
]
const pickQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)]

function txExplorerUrl(txId) {
  const [account, timePart = ''] = String(txId).split('@')
  const [secs = '', nanos = ''] = timePart.split('.')
  return `https://hashscan.io/testnet/transaction/${account}-${secs}-${nanos}`
}

// ─── Main ──────────────────────────────────────────────────────────────
const serverAcct = await getOrCreateServerAccount()
const serverAccountId = serverAcct.accountId
const serverKey = parseKey(serverAcct.privateKey)

const buildClient = () =>
  Client.forTestnet()
    .setOperator(AccountId.fromString(serverAccountId), serverKey)
    .setRequestTimeout(30000)

const signAndSubmit = createHederaSignAndSubmitTransaction(buildClient, serverKey)
const verifyPayerSig = createHederaVerifyPayerSignature()
const preflightTransfer = createHederaPreflightTransfer()

const signer = toFacilitatorHederaSigner({
  getAddresses: () => [serverAccountId],
  signAndSubmitTransaction: signAndSubmit,
  verifyPayerSignature: verifyPayerSig,
  preflightTransfer
})

const facilitator = new ExactHederaScheme(signer)

// ─── HTTP server ───────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  log(`[incoming] ${req.method} ${req.url}`)
  log(`[incoming headers] ${JSON.stringify(req.headers)}`)

  const send = (status, body, extraHeaders = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...extraHeaders })
    res.end(JSON.stringify(body, null, 2))
  }

  if (req.url === '/health') {
    return send(200, {
      status: 'ok',
      operator: operatorAccountId,
      serverAccount: serverAccountId
    })
  }

  if (req.url !== '/premium/quote') {
    return send(404, { error: 'Not found. Try GET /premium/quote' })
  }

  const resourceUrl = `http://localhost:${PORT}/premium/quote`
  const requirements = buildRequirements(resourceUrl, serverAccountId)
  const paymentHeader = req.headers['payment-signature'] || req.headers['x-payment']

  if (!paymentHeader) {
    log(`402 challenge sent to ${req.socket.remoteAddress}`)
    return send(402, {
      x402Version: 2,
      error: 'Payment required',
      resource: { url: resourceUrl, description: requirements.description, mimeType: requirements.mimeType },
      accepts: [requirements]
    })
  }

  try {
    const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'))
    log(`payment header received, verifying...`)

    const verifyResult = await facilitator.verify(decoded, requirements)
    if (!verifyResult.isValid) {
      log(`verify failed: ${verifyResult.invalidReason ?? 'unknown'}`)
      return send(400, {
        error: 'Payment verification failed',
        reason: verifyResult.invalidReason,
        payer: verifyResult.payer
      })
    }

    log(`verified. submitting settlement to Hedera testnet...`)
    const settleResult = await facilitator.settle(decoded, requirements)
    if (!settleResult.success) {
      log(`settle failed: ${settleResult.errorReason ?? 'unknown'} - ${settleResult.errorMessage ?? ''}`)
      return send(400, {
        error: 'Settlement failed',
        reason: settleResult.errorReason,
        details: settleResult.errorMessage
      })
    }

    log(`settled. tx: ${settleResult.transaction}`)

    const quote = pickQuote()
    const hashScanUrl = txExplorerUrl(settleResult.transaction)
    const paymentResponseHeader = Buffer.from(
      JSON.stringify(settleResult), 'utf8'
    ).toString('base64')

    return send(200, {
      quote: quote.text,
      author: quote.author,
      paid: {
        amount: chosenAsset.display,
        payer: settleResult.payer,
        recipient: serverAccountId,
        transaction: settleResult.transaction,
        hashScan: hashScanUrl
      }
    }, { 'Payment-Response': paymentResponseHeader })

  } catch (err) {
    log(`error: ${err instanceof Error ? err.message : String(err)}`)
    return send(500, { error: err instanceof Error ? err.message : String(err) })
  }
})

server.listen(PORT, () => {
  log('')
  log('┌──────────────────────────────────────────────────────────┐')
  log('│  x402 demo server running                               │')
  log('└──────────────────────────────────────────────────────────┘')
  log('')
  log(`Listening on:      http://localhost:${PORT}`)
  log(`Paid endpoint:     http://localhost:${PORT}/premium/quote`)
  log(`Payment:           ${chosenAsset.display} on Hedera testnet`)
  log(`Buyer account:     ${operatorAccountId} (your .env)`)
  log(`Server account:    ${serverAccountId} (auto-created, distinct)`)
  log('')
  log('In Claude Desktop:')
  log(`  "Fetch http://localhost:4021/premium/quote and pay if it costs ${chosenAsset.label}"`)
  log('')
})
