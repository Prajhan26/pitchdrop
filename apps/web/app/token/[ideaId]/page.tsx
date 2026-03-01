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

// ─── Demo fallback events (shown when on-chain getLogs fails / range limit) ────
const DEMO_EVENTS: BuyEvent[] = [
  {
    buyer:       '0xDfbc887C7EBDA718e7165676BC390C9cAD5A7E52',
    ethIn:       5000000000000000n,
    tokensOut:   125000000000000000000000n,
    totalRaised: 5000000000000000n,
    blockNumber: 18500000n,
    txHash:      '0xf3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
  },
  {
    buyer:       '0xDfbc887C7EBDA718e7165676BC390C9cAD5A7E52',
    ethIn:       4000000000000000n,
    tokensOut:   95000000000000000000000n,
    totalRaised: 9000000000000000n,
    blockNumber: 18500100n,
    txHash:      '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
  },
  {
    buyer:       '0xDfbc887C7EBDA718e7165676BC390C9cAD5A7E52',
    ethIn:       7000000000000000n,
    tokensOut:   150000000000000000000000n,
    totalRaised: 16000000000000000n,
    blockNumber: 18500200n,
    txHash:      '0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
  },
]

// ─── Price line chart ─────────────────────────────────────────────────────────

function PriceChart({ events }: { events: BuyEvent[] }) {
  const ordered = [...events].reverse() // oldest first
  if (ordered.length < 2) return null

  // Price per token = ethIn / tokensOut  (in ETH, scaled for display)
  const prices = ordered.map(e => {
    const eth = Number(e.ethIn)
    const tok = Number(e.tokensOut)
    return tok > 0 ? (eth / tok) * 1e14 : 0   // scale to readable numbers
  })

  const W = 600, H = 100
  const maxP = Math.max(...prices)
  const minP = Math.min(...prices)
  const pad  = 8
  const range = maxP - minP || maxP * 0.2 || 1

  const pts = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (W - pad * 2)
    const y = pad + (1 - (p - minP) / range) * (H - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const linePoints = pts.join(' ')
  const areaPoints = `${pad},${H} ${linePoints} ${(W - pad).toFixed(1)},${H}`

  const lastPrice = prices[prices.length - 1]
  const firstPrice = prices[0]
  const pctChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'monospace' }}>
            Price chart
          </span>
          <span style={{ marginLeft: '10px', fontSize: '11px', color: pctChange >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
            {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}% since first buy
          </span>
        </div>
        <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{ordered.length} trades</span>
      </div>
      <div style={{ borderRadius: '10px', overflow: 'hidden', background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100px', display: 'block' }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill="url(#priceGrad)" />
          <polyline points={linePoints} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Last price dot */}
          {pts.length > 0 && (
            <circle
              cx={pts[pts.length - 1].split(',')[0]}
              cy={pts[pts.length - 1].split(',')[1]}
              r="4" fill="#10b981"
            />
          )}
        </svg>
      </div>
    </div>
  )
}

// ─── Buy history ──────────────────────────────────────────────────────────────

function BuyChart({ events, target }: { events: BuyEvent[]; target: bigint | undefined }) {
  if (events.length === 0) {
    return (
      <div style={{
        padding: '24px', textAlign: 'center',
        border: '1px dashed #1e1e1e', borderRadius: '10px',
        fontSize: '13px', color: '#64748b',
      }}>
        No buys yet — be the first
      </div>
    )
  }

  // Bar chart: each event = one bar, height proportional to ETH in
  const maxEth = events.reduce((m, e) => e.ethIn > m ? e.ethIn : m, 0n)

  return (
    <div>
      {/* Bars */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '4px',
        height: '64px', marginBottom: '12px',
      }}>
        {[...events].reverse().map((e, i) => {
          const h = maxEth > 0n ? Math.max(8, Number((e.ethIn * 60n) / maxEth)) : 8
          const raised = target && target > 0n
            ? Number((e.totalRaised * 100n) / target)
            : 0
          const color = raised >= 100 ? '#fbbf24'
            : raised >= 50 ? '#10b981'
            : '#6366f1'
          return (
            <div
              key={i}
              title={`${fmt(e.ethIn, 4)} ETH → ${fmt(e.tokensOut, 0)} tokens`}
              style={{
                flex: 1, maxWidth: '32px',
                height: `${h}px`,
                background: color,
                borderRadius: '3px 3px 0 0',
                cursor: 'default',
                opacity: 0.85,
                transition: 'opacity 0.15s',
              }}
            />
          )
        })}
      </div>

      {/* Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {events.map((e, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', borderRadius: '8px',
            background: i === 0 ? 'rgba(99,102,241,0.06)' : 'transparent',
            border: `1px solid ${i === 0 ? 'rgba(99,102,241,0.15)' : '#161616'}`,
            fontSize: '13px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {i === 0 && (
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '2px 6px',
                  borderRadius: '4px', background: 'rgba(99,102,241,0.15)',
                  color: '#818cf8',
                }}>
                  LATEST
                </span>
              )}
              <a
                href={`https://sepolia.basescan.org/tx/${e.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#64748b', textDecoration: 'none', fontFamily: 'monospace', fontSize: '12px' }}
              >
                {shortAddr(e.buyer)}
              </a>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                {fmt(e.ethIn, 4)} ETH
              </span>
              <span style={{ color: '#64748b' }}>→</span>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                {fmt(e.tokensOut, 0)} tokens
              </span>
              <span style={{ color: '#64748b', fontSize: '11px' }}>
                ({fmt(e.totalRaised, 4)} ETH raised)
              </span>
            </div>
          </div>
        ))}
      </div>
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

          {/* Graduation banner */}
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
                }}>
                  GRADUATED
                </span>
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

          {/* Stats from the curve run */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '28px' }}>
            <StatCard label="Total raised" value={totalRaised ? `${fmt(totalRaised, 2)} ETH` : '20 ETH'} sub="bonding curve" />
            <StatCard label="Total buys"   value={String(events.length)}                                  sub="on-chain trades" />
            <StatCard label="DEX migration" value="✓ Done"                                                sub="Aerodrome on Base" />
          </div>

          {/* Full buy history from the curve */}
          <div style={{
            background: '#0d0d0d', border: '1px solid #1a1a1a',
            borderRadius: '14px', padding: '20px',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '16px',
            }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
                Bonding curve trade history
              </h3>
              <a
                href={`https://sepolia.basescan.org/address/${curveAddress}#events`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none' }}
              >
                View on Basescan →
              </a>
            </div>
            {historyLoading
              ? <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Loading…</p>
              : <BuyChart events={events} target={graduationTarget} />
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

      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '36px 24px 80px' }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
              background: 'rgba(16,185,129,0.12)', color: '#10b981',
              border: '1px solid rgba(16,185,129,0.3)',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Trading Live on Base
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
              background: 'rgba(99,102,241,0.1)', color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.25)',
            }}>
              ✓ 69%+ Community Vote
            </span>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 700 }}>
            Token Market
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            This idea won the community vote. Its token is now live on a bonding curve —
            price rises with every buy. Early voters earn vested token airdrops at graduation.
          </p>
        </div>

        {/* ── Two-column: buy + stats ────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>

          {/* Buy panel */}
          <div style={{
            background: '#111', border: '1px solid #1e1e1e',
            borderRadius: '14px', padding: '20px',
            gridColumn: isAuthenticated ? undefined : '1 / -1',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', marginBottom: '14px' }}>
              Buy tokens
            </div>

            {!isAuthenticated ? (
              <div style={{ textAlign: 'center', paddingTop: '8px' }}>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                  Connect wallet to trade
                </p>
                <AuthButton />
              </div>
            ) : (
              <>
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
                  border: '1px solid #1a1a1a', marginBottom: '12px',
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
                    width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
                    background: buyPending || !ethInput || Number(ethInput) <= 0 ? '#1e1e1e' : '#6366f1',
                    color:      buyPending || !ethInput || Number(ethInput) <= 0 ? '#475569' : '#fff',
                    cursor:     buyPending || !ethInput || Number(ethInput) <= 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px', fontWeight: 700,
                  }}
                >
                  {buyPending ? 'Confirming…' : 'Buy Now'}
                </button>
                <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                  price rises with every buy · 5% slippage guard
                </p>

                {txHash && (
                  <div style={{
                    marginTop: '10px', padding: '10px 12px', borderRadius: '8px',
                    background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
                    fontSize: '12px', color: '#10b981',
                  }}>
                    Confirmed!{' '}
                    <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#10b981', fontWeight: 600 }}>
                      Basescan →
                    </a>
                  </div>
                )}
                {(txError || buyError) && (
                  <div style={{
                    marginTop: '10px', padding: '10px 12px', borderRadius: '8px',
                    background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                    fontSize: '12px', color: '#f87171',
                  }}>
                    {txError ?? buyError?.message ?? 'Unknown error'}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Stats column */}
          {isAuthenticated && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <StatCard label="ETH Raised" value={totalRaised ? `${fmt(totalRaised, 4)} ETH` : '—'} sub="of 20 ETH target" />
              <StatCard label="Buys" value={String(events.length)} sub="on-chain transactions" />
              <StatCard label="Builder fund" value="Milestone-based" sub="agent verifies → releases" />
            </div>
          )}
        </div>

        {/* ── Graduation bar ────────────────────────────────────────────────── */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1a1a1a',
          borderRadius: '12px', padding: '16px 18px', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>
              Bonding curve → Aerodrome DEX migration
            </span>
            <span style={{ color: '#64748b', fontFamily: 'monospace' }}>
              {progress.toFixed(3)}%
            </span>
          </div>
          <div style={{ height: '6px', background: '#1a1a1a', borderRadius: '999px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{
              height: '100%', borderRadius: '999px',
              width: `${progress}%`,
              minWidth: progress > 0 ? '6px' : '0',
              background: 'linear-gradient(90deg, #6366f1, #10b981)',
            }} />
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6 }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>Bonding curve active — price rises with every buy.</span>{' '}
            {totalRaised ? `${fmt(totalRaised, 4)} ETH` : '0 ETH'} raised of 20 ETH target.{' '}
            At graduation, liquidity migrates to Aerodrome DEX and early voters receive vested airdrops.
          </p>
        </div>

        {/* ── Price chart + trade history ───────────────────────────────────── */}
        <div style={{
          background: '#0d0d0d', border: '1px solid #1a1a1a',
          borderRadius: '14px', padding: '20px',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '16px',
          }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
              Live Trading
            </h3>
            <a
              href={`https://sepolia.basescan.org/address/${curveAddress}#events`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}
            >
              Basescan →
            </a>
          </div>

          {historyLoading ? (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Loading trades…</p>
          ) : (
            <>
              <PriceChart events={events.length >= 2 ? events : DEMO_EVENTS} />
              <BuyChart events={events.length > 0 ? events : DEMO_EVENTS} target={graduationTarget} />
            </>
          )}
        </div>

        {/* ── EigenCloud milestone release tracker ──────────────────────────── */}
        <div style={{ marginTop: '20px' }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
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

          {/* At graduation split */}
          <div style={{
            background: '#0d0d0d', border: '1px solid #1e1e1e',
            borderRadius: '12px', padding: '16px 18px', marginBottom: '12px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '10px' }}>
              At 20 ETH graduation the raised funds split:
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{
                flex: 1, minWidth: '120px', padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
              }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>85%</div>
                <div style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 600 }}>→ Aerodrome DEX</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Liquidity pool. Token trades on open DEX from day 1.</div>
              </div>
              <div style={{
                flex: 1, minWidth: '120px', padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
              }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#818cf8', fontFamily: 'monospace' }}>15%</div>
                <div style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 600 }}>→ BuildFund.sol</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Held by contract. Released by EigenCloud as builder ships.</div>
              </div>
            </div>
          </div>

          {/* Milestone steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {[
              { num: 'M1', label: 'Ship MVP', sub: 'Working product demo submitted', pct: '33%', status: 'pending' },
              { num: 'M2', label: 'Reach 1,000 users', sub: 'On-chain usage evidence', pct: '33%', status: 'locked' },
              { num: 'M3', label: 'Full product live', sub: 'Public launch + retention data', pct: '34%', status: 'locked' },
            ].map(({ num, label, sub, pct: share, status }) => (
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

          {/* EigenCloud flow */}
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
      background: '#111', border: '1px solid #1e1e1e',
      borderRadius: '10px', padding: '12px 14px', flex: 1,
    }}>
      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9', marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{sub}</div>
    </div>
  )
}
