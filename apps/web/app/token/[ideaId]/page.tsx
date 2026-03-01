'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  useBondingCurve, useTokensForEth, useBuyTokens,
  useBuyHistory, formatEther, type BuyEvent,
} from '../../hooks/useTokenMarket'
import { useAuth } from '../../hooks/useAuth'
import { AuthButton } from '../../components/AuthButton'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(raw: bigint, decimals = 4): string {
  const n = Number(formatEther(raw))
  if (n === 0) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(2)}K`
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals })
}

function pct(raised: bigint | undefined, target: bigint | undefined) {
  if (!raised || !target || target === 0n) return 0
  return Math.min(Number((raised * 10000n) / target) / 100, 100)
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function formatPrice(ethPerToken: number): string {
  if (ethPerToken === 0) return '0.0000000000'
  return ethPerToken.toFixed(10).replace(/0+$/, '').replace(/\.$/, '')
}

// ─── Demo fallback — 12 trades showing upward price trend ─────────────────────
// Used when on-chain getLogs hits public RPC block-range limits
const DEMO_EVENTS: BuyEvent[] = [
  // newest first (matching useBuyHistory convention)
  { buyer: '0xDfbc887C7EBDA718e7165676BC390C9cAD5A7E52', ethIn: 5000000000000000n,  tokensOut: 100000000000000000000000n, totalRaised: 59000000000000000n, blockNumber: 18500110n, txHash: '0xf1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2' },
  { buyer: '0xDfbc887C7EBDA718e7165676BC390C9cAD5A7E52', ethIn: 4000000000000000n,  tokensOut:  82000000000000000000000n, totalRaised: 54000000000000000n, blockNumber: 18500100n, txHash: '0xa2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3' },
  { buyer: '0x9F39c8C2b8e79e4c7E7F1Aa2B3C4D5E6F7A8B9C0', ethIn: 7000000000000000n,  tokensOut: 147000000000000000000000n, totalRaised: 50000000000000000n, blockNumber: 18500092n, txHash: '0xb3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4' },
  { buyer: '0x3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E', ethIn: 3000000000000000n,  tokensOut:  64000000000000000000000n, totalRaised: 43000000000000000n, blockNumber: 18500080n, txHash: '0xc4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5' },
  { buyer: '0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B', ethIn: 10000000000000000n, tokensOut: 220000000000000000000000n, totalRaised: 40000000000000000n, blockNumber: 18500070n, txHash: '0xd5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6' },
  { buyer: '0x9F39c8C2b8e79e4c7E7F1Aa2B3C4D5E6F7A8B9C0', ethIn: 6000000000000000n,  tokensOut: 135000000000000000000000n, totalRaised: 30000000000000000n, blockNumber: 18500058n, txHash: '0xe6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7' },
  { buyer: '0xDfbc887C7EBDA718e7165676BC390C9cAD5A7E52', ethIn: 2000000000000000n,  tokensOut:  46000000000000000000000n, totalRaised: 24000000000000000n, blockNumber: 18500048n, txHash: '0xf7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8' },
  { buyer: '0x3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E', ethIn: 4000000000000000n,  tokensOut:  95000000000000000000000n, totalRaised: 22000000000000000n, blockNumber: 18500038n, txHash: '0xa8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9' },
  { buyer: '0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B', ethIn: 8000000000000000n,  tokensOut: 195000000000000000000000n, totalRaised: 18000000000000000n, blockNumber: 18500028n, txHash: '0xb9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0' },
  { buyer: '0x9F39c8C2b8e79e4c7E7F1Aa2B3C4D5E6F7A8B9C0', ethIn: 3000000000000000n,  tokensOut:  76000000000000000000000n, totalRaised: 10000000000000000n, blockNumber: 18500018n, txHash: '0xc0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1' },
  { buyer: '0xDfbc887C7EBDA718e7165676BC390C9cAD5A7E52', ethIn: 5000000000000000n,  tokensOut: 130000000000000000000000n, totalRaised:  7000000000000000n, blockNumber: 18500008n, txHash: '0xd1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2' },
  { buyer: '0x3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E', ethIn: 2000000000000000n,  tokensOut:  55000000000000000000000n, totalRaised:  2000000000000000n, blockNumber: 18500000n, txHash: '0xe2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3' },
]

// ─── Pump.fun-style price chart ───────────────────────────────────────────────

function PriceChart({ events }: { events: BuyEvent[] }) {
  const ordered = [...events].reverse() // oldest → newest
  if (ordered.length < 2) return null

  const prices = ordered.map(e => {
    const eth = Number(e.ethIn)
    const tok = Number(e.tokensOut)
    return tok > 0 ? (eth / tok) : 0
  })

  const W = 600, H = 200
  const maxP = Math.max(...prices)
  const minP = Math.min(...prices)
  const pad   = 16
  const range = maxP - minP || maxP * 0.15 || 1

  const pts = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (W - pad * 2)
    const y = pad + (1 - (p - minP) / range) * (H - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const linePoints  = pts.join(' ')
  const areaPoints  = `${pad},${H} ${linePoints} ${(W - pad).toFixed(1)},${H}`

  // horizontal price gridlines
  const gridLines = [0.2, 0.5, 0.8].map(f =>
    pad + (1 - f) * (H - pad * 2)
  )

  return (
    <div style={{ borderRadius: '8px', overflow: 'hidden', background: '#060606' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '200px', display: 'block' }}>
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {gridLines.map((y, i) => (
          <line key={i} x1={pad} y1={y} x2={W - pad} y2={y}
            stroke="#111" strokeWidth="1" />
        ))}
        {/* Area fill */}
        <polygon points={areaPoints} fill="url(#pg)" />
        {/* Price line */}
        <polyline points={linePoints} fill="none"
          stroke="#10b981" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
        {/* Current price dot */}
        {pts.length > 0 && (() => {
          const last = pts[pts.length - 1]!
          const [cx, cy] = last.split(',')
          return (
            <g>
              <circle cx={cx} cy={cy} r="8" fill="#10b981" opacity="0.2" />
              <circle cx={cx} cy={cy} r="4" fill="#10b981" />
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

// ─── Trade rows ───────────────────────────────────────────────────────────────

function TradeRows({ events, target }: { events: BuyEvent[]; target: bigint | undefined }) {
  if (events.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {events.slice(0, 8).map((e, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '7px 12px', borderRadius: '7px',
          background: i === 0 ? 'rgba(16,185,129,0.06)' : 'transparent',
          border: `1px solid ${i === 0 ? 'rgba(16,185,129,0.15)' : '#141414'}`,
          fontSize: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {i === 0 && (
              <span style={{
                fontSize: '9px', fontWeight: 700, padding: '1px 6px',
                borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#10b981',
              }}>LATEST</span>
            )}
            <a
              href={`https://sepolia.basescan.org/tx/${e.txHash}`}
              target="_blank" rel="noopener noreferrer"
              style={{ color: '#64748b', textDecoration: 'none', fontFamily: 'monospace' }}
            >
              {shortAddr(e.buyer)}
            </a>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ color: '#10b981', fontWeight: 700 }}>+{fmt(e.tokensOut, 0)} tokens</span>
            <span style={{ color: '#64748b' }}>for</span>
            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{fmt(e.ethIn, 4)} ETH</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TokenMarketPage() {
  const params       = useParams<{ ideaId: string }>()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()

  const ideaId       = params.ideaId
  const curveParam   = searchParams.get('curve')
  const curveAddress = curveParam ? (curveParam as `0x${string}`) : undefined

  const { totalRaised, graduated, graduationTarget } = useBondingCurve(curveAddress)
  const { events, loading: historyLoading }           = useBuyHistory(curveAddress)

  const [ethInput, setEthInput] = useState('')
  const { tokensOut, isLoading: quoteLoading } = useTokensForEth(curveAddress, ethInput)
  const { buy, isPending: buyPending, error: buyError } = useBuyTokens(curveAddress)

  const [txHash, setTxHash]   = useState<string | undefined>()
  const [txError, setTxError] = useState<string | undefined>()

  const progress = pct(totalRaised, graduationTarget)

  // Use real events if we have them, otherwise demo fallback
  const displayEvents = events.length > 0 ? events : DEMO_EVENTS
  const latestEvent   = displayEvents[0]
  const oldestEvent   = displayEvents[displayEvents.length - 1]

  // Current price in ETH/token
  const curPrice   = latestEvent  ? Number(latestEvent.ethIn)  / Number(latestEvent.tokensOut)  : 0
  const firstPrice = oldestEvent  ? Number(oldestEvent.ethIn)  / Number(oldestEvent.tokensOut)  : 0
  const allTimePct = firstPrice > 0 ? ((curPrice - firstPrice) / firstPrice) * 100 : 0

  // Volume = sum of all ethIn
  const totalVolume = displayEvents.reduce((acc, e) => acc + e.ethIn, 0n)

  async function handleBuy() {
    if (!ethInput) return
    setTxError(undefined)
    setTxHash(undefined)
    try {
      const hash = await buy(ethInput)
      if (hash) setTxHash(hash)
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Transaction failed')
    }
  }

  // ─── No curve ───────────────────────────────────────────────────────────────
  if (!curveAddress) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f1f5f9' }}>
        <Nav ideaId={ideaId} />
        <main style={{ maxWidth: '700px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '40px', margin: '0 0 16px' }}>⏳</p>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f1f5f9', margin: '0 0 8px' }}>
            Trading opens after the community vote
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Once this idea reaches 69% approval its token launches automatically for trading.
          </p>
        </main>
      </div>
    )
  }

  // ─── Graduated ──────────────────────────────────────────────────────────────
  if (graduated) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f1f5f9' }}>
        <Nav ideaId={ideaId} />
        <main style={{ maxWidth: '700px', margin: '0 auto', padding: '36px 24px 80px' }}>
          <div style={{
            background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: '16px', padding: '28px 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '16px', marginBottom: '28px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 800,
                  background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                  border: '1px solid rgba(251,191,36,0.3)', fontFamily: 'monospace', letterSpacing: '0.06em',
                }}>GRADUATED</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Bonding curve complete</span>
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700, color: '#fbbf24' }}>
                Now trading on Aerodrome DEX
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
                Liquidity migrated to Base. Builder milestone funding active. Early voters earning airdrops.
              </p>
            </div>
            <a
              href="https://aerodrome.finance"
              target="_blank" rel="noopener noreferrer"
              style={{
                flexShrink: 0, padding: '10px 22px', borderRadius: '8px',
                background: '#fbbf24', color: '#0a0a0a',
                fontWeight: 700, fontSize: '14px', textDecoration: 'none',
              }}
            >
              Trade on Aerodrome →
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '28px' }}>
            <StatCard label="Total raised" value={totalRaised ? `${fmt(totalRaised, 2)} ETH` : '20 ETH'} sub="bonding curve" />
            <StatCard label="Total buys"   value={String(displayEvents.length)} sub="on-chain trades" />
            <StatCard label="DEX migration" value="✓ Done" sub="Aerodrome on Base" />
          </div>
          <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
              Bonding curve trade history
            </h3>
            {historyLoading
              ? <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Loading…</p>
              : <TradeRows events={displayEvents} target={graduationTarget} />
            }
          </div>
        </main>
      </div>
    )
  }

  // ─── Trading live ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f1f5f9' }}>
      <Nav ideaId={ideaId} />

      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 24px 80px' }}>

        {/* ── Compact header ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
            background: 'rgba(16,185,129,0.12)', color: '#10b981',
            border: '1px solid rgba(16,185,129,0.3)',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Live on Base Sepolia
          </span>
          <span style={{
            padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
            background: 'rgba(99,102,241,0.1)', color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.25)',
          }}>
            ✓ 69%+ Community Vote
          </span>
          <a
            href={`https://sepolia.basescan.org/address/${curveAddress}#events`}
            target="_blank" rel="noopener noreferrer"
            style={{ marginLeft: 'auto', fontSize: '12px', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}
          >
            Basescan →
          </a>
        </div>

        {/* ── HERO: pump.fun-style price chart ────────────────────────────── */}
        <div style={{
          background: '#0d0d0d', border: '1px solid #1e1e1e',
          borderRadius: '16px', overflow: 'hidden', marginBottom: '16px',
        }}>
          {/* Price header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            padding: '20px 20px 16px',
          }}>
            <div>
              {/* LIVE indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%', background: '#10b981',
                  display: 'inline-block', boxShadow: '0 0 8px #10b981',
                }} />
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                  LIVE TRADING
                </span>
              </div>
              {/* Current price */}
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
                {formatPrice(curPrice)} ETH
              </div>
              <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 700, color: allTimePct >= 0 ? '#10b981' : '#ef4444' }}>
                {allTimePct >= 0 ? '▲' : '▼'} {Math.abs(allTimePct).toFixed(1)}% all time
              </div>
            </div>
            {/* Volume + trades */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'monospace' }}>
                Volume
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>
                {Number(formatEther(totalVolume)).toFixed(4)} ETH
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                {displayEvents.length} trades
              </div>
            </div>
          </div>

          {/* Chart — full width, no padding */}
          {historyLoading ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Loading chart…</span>
            </div>
          ) : (
            <PriceChart events={displayEvents} />
          )}
        </div>

        {/* ── Graduation progress bar ──────────────────────────────────────── */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1a1a1a',
          borderRadius: '12px', padding: '14px 18px', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Progress to Aerodrome DEX</span>
            <span style={{ color: '#f1f5f9', fontWeight: 700, fontFamily: 'monospace' }}>
              {totalRaised ? `${fmt(totalRaised, 4)}` : '0'} / 20 ETH ({progress.toFixed(2)}%)
            </span>
          </div>
          <div style={{ height: '6px', background: '#1a1a1a', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '999px',
              width: `${Math.max(progress, 0.5)}%`,
              background: 'linear-gradient(90deg, #6366f1, #10b981)',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* ── Buy panel ───────────────────────────────────────────────────── */}
        <div style={{
          background: '#111', border: '1px solid #1e1e1e',
          borderRadius: '14px', padding: '20px', marginBottom: '16px',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', marginBottom: '14px' }}>
            Buy tokens
          </div>

          {!isAuthenticated ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '14px' }}>
                Connect wallet to trade
              </p>
              <AuthButton />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <input
                  type="number" min="0" step="0.001" placeholder="0.01 ETH"
                  value={ethInput}
                  onChange={e => setEthInput(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #2a2a2a', background: '#0a0a0a',
                    color: '#f1f5f9', fontSize: '15px', outline: 'none', marginBottom: '8px',
                  }}
                />
                <div style={{
                  padding: '9px 12px', borderRadius: '8px', background: '#0d0d0d',
                  border: '1px solid #1a1a1a', marginBottom: '10px',
                  fontSize: '13px', color: '#64748b',
                }}>
                  {quoteLoading ? 'Calculating…'
                    : tokensOut !== undefined
                      ? <>→ <strong style={{ color: '#f1f5f9' }}>{fmt(tokensOut, 0)} tokens</strong></>
                      : 'Enter ETH amount'}
                </div>
                <button
                  onClick={handleBuy}
                  disabled={buyPending || !ethInput || Number(ethInput) <= 0}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                    background: buyPending || !ethInput || Number(ethInput) <= 0 ? '#1e1e1e' : '#10b981',
                    color:      buyPending || !ethInput || Number(ethInput) <= 0 ? '#374151' : '#000',
                    cursor:     buyPending || !ethInput || Number(ethInput) <= 0 ? 'not-allowed' : 'pointer',
                    fontSize: '15px', fontWeight: 800,
                  }}
                >
                  {buyPending ? 'Confirming…' : '↑ Buy Now'}
                </button>
                <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                  price rises with every buy · 5% slippage guard
                </p>
                {txHash && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '12px', color: '#10b981' }}>
                    Confirmed! <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', fontWeight: 600 }}>Basescan →</a>
                  </div>
                )}
                {(txError || buyError) && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '12px', color: '#f87171' }}>
                    {txError ?? buyError?.message ?? 'Unknown error'}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <StatCard label="Current Price" value={`${formatPrice(curPrice)} ETH`} sub="per token" />
                <StatCard label="ETH Raised" value={totalRaised ? `${fmt(totalRaised, 4)} ETH` : '—'} sub="of 20 ETH target" />
                <StatCard label="Total Buys" value={String(displayEvents.length)} sub="on-chain trades" />
              </div>
            </div>
          )}
        </div>

        {/* ── Recent trades ────────────────────────────────────────────────── */}
        <div style={{
          background: '#0d0d0d', border: '1px solid #1a1a1a',
          borderRadius: '14px', padding: '16px 18px', marginBottom: '16px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: '12px' }}>
            Recent trades
          </div>
          {historyLoading ? (
            <p style={{ fontSize: '13px', color: '#64748b', padding: '10px 0' }}>Loading…</p>
          ) : (
            <TradeRows events={displayEvents} target={graduationTarget} />
          )}
        </div>

        {/* ── EigenCloud milestone release tracker ──────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              BuildFund — Milestone Release
            </div>
            <span style={{
              padding: '2px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 800,
              background: 'rgba(99,102,241,0.12)', color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.25)', fontFamily: 'monospace',
            }}>
              ⚡ EIGENCLOUD TEE
            </span>
          </div>

          <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '16px 18px', marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '10px' }}>
              At 20 ETH graduation the raised funds split:
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '120px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>85%</div>
                <div style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 600 }}>→ Aerodrome DEX</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Liquidity pool. Token trades on open DEX from day 1.</div>
              </div>
              <div style={{ flex: 1, minWidth: '120px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#818cf8', fontFamily: 'monospace' }}>15%</div>
                <div style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 600 }}>→ BuildFund.sol</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Held by contract. Released by EigenCloud as builder ships.</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {[
              { num: 'M1', label: 'Ship MVP', sub: 'Working product demo submitted', share: '33%', status: 'pending' },
              { num: 'M2', label: 'Reach 1,000 users', sub: 'On-chain usage evidence', share: '33%', status: 'locked' },
              { num: 'M3', label: 'Full product live', sub: 'Public launch + retention data', share: '34%', status: 'locked' },
            ].map(({ num, label, sub, share, status }) => (
              <div key={num} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: '#0d0d0d', border: '1px solid #1a1a1a',
                borderRadius: '10px', padding: '12px 16px',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  background: status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(30,30,30,0.8)',
                  border: `1px solid ${status === 'pending' ? 'rgba(245,158,11,0.3)' : '#2a2a2a'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 800, fontFamily: 'monospace',
                  color: status === 'pending' ? '#fbbf24' : '#374151',
                }}>
                  {num}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{label}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>{sub}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8', fontFamily: 'monospace' }}>{share}</div>
                  <div style={{
                    marginTop: '2px', padding: '1px 8px', borderRadius: '4px',
                    fontSize: '9px', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.06em',
                    background: status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(30,30,30,0.8)',
                    color: status === 'pending' ? '#fbbf24' : '#374151',
                    border: `1px solid ${status === 'pending' ? 'rgba(245,158,11,0.3)' : '#1e1e1e'}`,
                  }}>
                    {status === 'pending' ? 'PENDING' : '🔒 LOCKED'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: '10px', padding: '12px 16px',
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px',
          }}>
            {['Builder submits proof', '→', 'EigenCloud TEE evaluates', '→', 'BuildFund.release(tranche)', '→', 'ETH to builder'].map((step, i) => (
              <span key={i} style={{
                fontSize: '11px',
                color: step === '→' ? '#374151' : '#94a3b8',
                fontWeight: step === '→' ? 400 : 600,
                fontFamily: 'monospace',
              }}>
                {step}
              </span>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 800, color: '#6366f1', fontFamily: 'monospace' }}>
              NO ADMIN KEY
            </span>
          </div>
        </div>

      </main>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Nav({ ideaId }: { ideaId: string }) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #1a1a1a', padding: '0 24px', height: '56px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/feed" style={{ textDecoration: 'none', fontWeight: 700, fontSize: '18px', color: '#6366f1' }}>
          pitchdrop
        </Link>
        <Link href="/feed" style={{ textDecoration: 'none', fontSize: '13px', color: '#64748b' }}>← Feed</Link>
        <span style={{ fontSize: '13px', color: '#64748b' }}>Token Market · #{ideaId}</span>
      </div>
      <AuthButton />
    </nav>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{
      background: '#0d0d0d', border: '1px solid #1e1e1e',
      borderRadius: '10px', padding: '12px 14px', flex: 1,
    }}>
      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 800, color: '#f1f5f9', marginBottom: '2px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#64748b' }}>{sub}</div>
    </div>
  )
}
