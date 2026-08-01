# Demo video script

The Hedera x402 bounty requires a demo under five minutes showing the end-to-end flow. This is a suggested beat sheet you can shoot in one take, or record in segments and stitch.

Total budget: 4 min 45 sec, leaving 15 seconds of headroom.

## Setup before rolling

- Screen recorder ready (OBS, ScreenPal, or QuickTime).
- Terminal open at the Hedwig repo root with `.env` filled in.
- HashScan open in a browser tab, on the testnet transaction page (not account page).
- Claude Desktop open with Hedwig configured in `claude_desktop_config.json`.
- Speak in a normal tone; the judges want to see the tech, not a pitch performance.

## Beat 1 - The problem, in one sentence (0:00 to 0:20)

Camera on you or your terminal.

> "AI agents can plan and act, but the moment they hit a paid endpoint they stop and ask a human. Hedwig closes that gap by giving the agent a Hedera wallet that speaks x402."

## Beat 2 - The repository (0:20 to 0:45)

Screen on your code editor. Scroll the `src/tools/` folder briefly.

> "Six tools, all MCP endpoints: check balance, transfer HBAR, transfer USDC, sign an x402 payment, do a full x402 fetch with retry, and a spending report with budget caps. Payments settle as real HTS USDC transfers on Hedera."

## Beat 3 - Run the smoke test (0:45 to 2:15)

Terminal. Run `run.bat` on Windows or `./run.sh` on Unix.

Narrate over the output:

- npm install skipped (already there)
- Build succeeds in under a second
- Unit tests: 10 pass in a couple of seconds
- Smoke script begins

When the smoke script prints the association or the HBAR transfer:

> "That is a real transaction on Hedera testnet. Notice the fee: a tenth of a cent, fixed. HashScan will show it in about three seconds."

When you get the final HashScan links block:

> "These are the on-chain proofs. I will drop these into the submission form."

Alt-tab to HashScan, paste the HBAR transfer URL, and let the page load. Zoom in on the transfer detail (tinybar amounts, memo, timestamp).

## Beat 4 - Agent-driven payment (2:15 to 4:00)

Alt-tab to Claude Desktop. Open a new chat.

Type: **"Check my Hedera balance."**

Wait. Claude calls `check_balance`. Read out the returned HBAR and USDC numbers.

Type: **"Send 0.02 HBAR to 0.0.98."**

Claude calls `transfer_hbar`. Show the returned HashScan link. Click it, wait for the tx to show in HashScan.

Type: **"Sign an x402 payment for 0.01 USDC to 0.0.98 for the URL https://example.com/premium."**

Claude calls `pay`. Read out the returned payment header value and the recipient. Note the amount is well under the `MAX_PER_CALL` cap.

Type: **"Give me a spending report."**

Claude calls `spending_report`. Show the session totals and the recent history.

## Beat 5 - Wrap (4:00 to 4:45)

Back to camera or terminal.

> "That is Hedwig. An agent-native Hedera wallet that turns 402 Payment Required from a dead end into a normal HTTP response. Six MCP tools, real HTS settlement, budget caps enforced pre-sign, MetaMask-compatible ECDSA keys. Repo and MCPB bundle are in the submission."

Fade or stop.

## What the video needs to include for the bounty

- End-to-end flow (Beats 3 and 4 both count)
- On-chain settlement visible in HashScan (Beat 3 tail, Beat 4 mid)
- Focus on the tech and the payments, not slide-ware

## Things to *not* do

- Do not read out your private key or account balance in a way that shows more than the account ID.
- Do not run this on mainnet.
- Do not extend past five minutes; judges get less generous after the timer runs out.

## Submission checklist

Before hitting submit on https://forms.gle/oWbifBqkvbk2oANC7:

- [ ] Public GitHub repo URL (push this repo up before you record)
- [ ] Video URL (YouTube unlisted works)
- [ ] HashScan links from the smoke run
- [ ] Account ID you used for the demo (so judges can verify)
- [ ] Team info if submitting as a team
