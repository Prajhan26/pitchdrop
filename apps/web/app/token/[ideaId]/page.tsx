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

// ─── Buy history mini-chart ───────────────────────────────────────────────────

function BuyChart({ events, target }: { events: BuyEvent[]; target: bigint | undefined }) {
  if (events.length === 0) {
    return (
      <div style={{
        padding: '24px', textAlign: 'center',
        border: '1px dashed #1e1e1e', borderRadius: '10px',
        fontSize: '13px', color: '#374151',
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
              title={`${fmt(e.ethIn, 4)} ETH → ${fmt(e.tokensOut, 0)} CONV`}
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
              <span style={{ color: '#475569' }}>→</span>
              <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
                {fmt(e.tokensOut, 0)} CONV
              </span>
              <span style={{ color: '#374151', fontSize: '11px' }}>
                ({fmt(e.totalRaised, 4)} raised)
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
            Once this idea reaches 69% approval the CONV token launches automatically.
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
        <main style={{ maxWidth: '700px', margin: '0 auto', padding: '60px 24px' }}>
          <div style={{
            background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: '16px', padding: '40px 32px', textAlign: 'center',
          }}>
            <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🎓</p>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fbbf24', margin: '0 0 10px' }}>
              Graduated to Aerodrome DEX
            </h2>
            <p style={{ fontSize: '14px', color: '#78716c', margin: '0 0 24px', lineHeight: 1.6 }}>
              The curve hit its target. Liquidity migrated to Aerodrome on Base.
              Builder received their first milestone tranche. Early voters earn vested CONV airdrops.
            </p>
            <a
              href="https://aerodrome.finance"
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-block', padding: '10px 24px', borderRadius: '8px',
                background: '#fbbf24', color: '#0a0a0a',
                fontWeight: 700, fontSize: '14px', textDecoration: 'none',
              }}
            >
              Trade on Aerodrome →
            </a>
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
            CONV Token · Pitch #{ideaId}
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
            Community approved this idea. Token is live — buy in now, price rises with every purchase.
            Builder submits milestones to unlock funding. Early voters earn vested CONV airdrops.
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
              Buy CONV
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
                      ? <>→ <strong style={{ color: '#f1f5f9' }}>{fmt(tokensOut, 0)} CONV</strong></>
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
                <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#374151', textAlign: 'center' }}>
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
              <StatCard label="Builder fund" value="Milestone" sub="agent verifies → releases" />
            </div>
          )}
        </div>

        {/* ── Graduation bar ────────────────────────────────────────────────── */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1a1a1a',
          borderRadius: '12px', padding: '16px 18px', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
            <span style={{ color: '#475569', fontWeight: 600 }}>
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
          <p style={{ margin: 0, fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>Bonding curve active — price rising with every buy.</span>{' '}
            {totalRaised ? `${fmt(totalRaised, 4)} ETH` : '0 ETH'} raised of 20 ETH target.
            At graduation, token migrates to Aerodrome DEX and early voters receive vested airdrops.
          </p>
        </div>

        {/* ── Buy history ───────────────────────────────────────────────────── */}
        <div style={{
          background: '#0d0d0d', border: '1px solid #1a1a1a',
          borderRadius: '14px', padding: '20px',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '16px',
          }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
              Trade History
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
            ? <p style={{ fontSize: '13px', color: '#374151', textAlign: 'center', padding: '20px 0' }}>Loading…</p>
            : <BuyChart events={events} target={graduationTarget} />
          }
        </div>

        {/* ── What happens next ─────────────────────────────────────────────── */}
        <div style={{
          marginTop: '20px', background: '#0a0a0a', border: '1px solid #161616',
          borderRadius: '12px', padding: '18px',
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            What happens at graduation
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { icon: '💧', text: '85% of raised ETH → Aerodrome liquidity pool. Token trades on open DEX from day 1.' },
              { icon: '🏗️', text: 'Builder submits milestone proof → EigenCloud agent verifies → BuildFund releases the tranche.' },
              { icon: '🎁', text: 'Early voters (T1/T2/T3) receive vested CONV airdrops. T1 = 3× multiplier, vests over 90 days.' },
              { icon: '⚡', text: 'No admin key. The Sovereign Agent is the only authority on fund release.' },
            ].map(({ icon, text }) => (
              <div key={icon} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px' }}>{icon}</span>
                <span style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
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
        <Link href="/feed" style={{ textDecoration: 'none', fontSize: '13px', color: '#475569' }}>← Feed</Link>
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
      <div style={{ fontSize: '10px', color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9', marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#374151' }}>{sub}</div>
    </div>
  )
}
