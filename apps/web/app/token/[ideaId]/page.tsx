'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useBondingCurve, useTokensForEth, useBuyTokens, formatEther } from '../../hooks/useTokenMarket'
import { useAuth } from '../../hooks/useAuth'
import { AuthButton } from '../../components/AuthButton'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTokens(raw: bigint | undefined): string {
  if (raw === undefined) return '—'
  const num = Number(formatEther(raw))
  if (num === 0) return '0'
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function progressPct(totalRaised: bigint | undefined, target: bigint | undefined): number {
  if (!totalRaised || !target || target === 0n) return 0
  return Math.min(Number((totalRaised * 10000n) / target) / 100, 100)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TokenMarketPage() {
  const params       = useParams<{ ideaId: string }>()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()

  const ideaId      = params.ideaId
  const curveParam  = searchParams.get('curve')
  const curveAddress = curveParam ? (curveParam as `0x${string}`) : undefined

  const { totalRaised, graduated, graduationTarget } = useBondingCurve(curveAddress)

  const [ethInput, setEthInput] = useState('')
  const { tokensOut, isLoading: quoteLoading } = useTokensForEth(curveAddress, ethInput)
  const { buy, isPending: buyPending, error: buyError } = useBuyTokens(curveAddress)

  const [txHash, setTxHash]   = useState<string | undefined>()
  const [txError, setTxError] = useState<string | undefined>()

  const pct = progressPct(totalRaised, graduationTarget)

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
        <main style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⧗</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#f1f5f9', marginBottom: '8px' }}>
            Token market not yet launched
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            This idea needs to reach 69% approval before its bonding curve activates.
          </p>
        </main>
      </div>
    )
  }

  // ─── Main ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f1f5f9' }}>
      <Nav ideaId={ideaId} />

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span style={{
              padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
              background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.35)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              ✓ Community Approved
            </span>
            {graduated && (
              <span style={{
                padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                ★ Graduated to DEX
              </span>
            )}
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 700, color: '#f1f5f9' }}>
            CONV Token — Pitch #{ideaId}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
            This idea won the community vote. Buy conviction tokens now — when the raise hits 20 ETH,
            liquidity moves to an on-chain DEX and the builder receives milestone-gated funding.
          </p>
        </div>

        {/* ── Lifecycle steps ───────────────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '28px',
        }}>
          {[
            { n: '1', label: 'Idea Submitted',    done: true  },
            { n: '2', label: '69%+ Community Vote', done: true  },
            { n: '3', label: 'Bonding Curve Live', done: true  },
            { n: '4', label: 'DEX + Builder Fund', done: graduated ?? false },
          ].map(({ n, label, done }) => (
            <div key={n} style={{
              background: done ? 'rgba(99,102,241,0.1)' : '#111',
              border: `1px solid ${done ? 'rgba(99,102,241,0.4)' : '#1e1e1e'}`,
              borderRadius: '10px',
              padding: '12px 10px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%', margin: '0 auto 6px',
                background: done ? '#6366f1' : '#1e1e1e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: done ? '#fff' : '#475569',
              }}>
                {done ? '✓' : n}
              </div>
              <div style={{ fontSize: '11px', color: done ? '#a5b4fc' : '#475569', fontWeight: 500, lineHeight: 1.3 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Graduation banner ─────────────────────────────────────────────── */}
        {graduated && (
          <div style={{
            background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: '12px', padding: '16px 20px', marginBottom: '28px',
            fontSize: '14px', color: '#fbbf24', fontWeight: 500,
          }}>
            Token graduated — now trading on Aerodrome DEX. Builder fund released for milestone delivery.
          </div>
        )}

        {/* ── Raise progress ────────────────────────────────────────────────── */}
        <div style={{
          background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px',
          padding: '20px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
              Raise Progress to DEX Listing
            </span>
            <span style={{ fontSize: '13px', color: '#f1f5f9', fontWeight: 700 }}>
              {pct.toFixed(1)}%
            </span>
          </div>
          <div style={{
            height: '10px', background: '#1e1e1e', borderRadius: '999px',
            overflow: 'hidden', marginBottom: '10px',
          }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: graduated ? '#fbbf24' : 'linear-gradient(90deg, #6366f1, #10b981)',
              borderRadius: '999px', transition: 'width 0.4s ease',
            }} />
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {totalRaised !== undefined ? `${formatEther(totalRaised)} ETH` : '— ETH'} raised
            {' '}of{' '}
            {graduationTarget !== undefined ? `${formatEther(graduationTarget)} ETH` : '20 ETH'} target
            {!graduated && ' — then 15% to builder fund, rest to DEX liquidity'}
          </p>
        </div>

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px',
        }}>
          <StatCard label="ETH Raised"      value={totalRaised !== undefined ? `${formatEther(totalRaised)} ETH` : '—'} />
          <StatCard label="Builder Fund"    value="15% on graduation" />
          <StatCard label="DEX Listing"     value={graduated ? 'Aerodrome ✓' : `At 20 ETH`} />
        </div>

        {/* ── Buy panel ─────────────────────────────────────────────────────── */}
        {!graduated ? (
          <>
            {!isAuthenticated ? (
              <div style={{
                background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px',
                padding: '32px', textAlign: 'center',
              }}>
                <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
                  Back this idea with ETH
                </p>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                  Buy conviction tokens on the bonding curve. Price rises as more people buy.
                  Early backers get the best price.
                </p>
                <AuthButton />
              </div>
            ) : (
              <div style={{
                background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px',
              }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>
                  Buy Conviction Tokens
                </h2>
                <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>
                  Price increases with every purchase. Sell back or hold until DEX graduation.
                </p>

                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                  ETH Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0.01"
                  value={ethInput}
                  onChange={e => setEthInput(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 14px',
                    borderRadius: '8px', border: '1px solid #2a2a2a',
                    background: '#0a0a0a', color: '#f1f5f9', fontSize: '15px',
                    outline: 'none', marginBottom: '12px',
                  }}
                />

                <div style={{
                  padding: '10px 14px', borderRadius: '8px', background: '#0f0f0f',
                  border: '1px solid #1e1e1e', marginBottom: '16px',
                  fontSize: '13px', color: '#94a3b8',
                }}>
                  {quoteLoading
                    ? 'Calculating…'
                    : tokensOut !== undefined
                      ? <>You receive: <strong style={{ color: '#f1f5f9' }}>{formatTokens(tokensOut)} CONV</strong> tokens</>
                      : 'Enter an ETH amount to see your token quote'
                  }
                </div>

                <button
                  onClick={handleBuy}
                  disabled={buyPending || !ethInput || Number(ethInput) <= 0}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                    background: buyPending || !ethInput || Number(ethInput) <= 0 ? '#1e1e1e' : '#6366f1',
                    color:      buyPending || !ethInput || Number(ethInput) <= 0 ? '#475569' : '#fff',
                    cursor:     buyPending || !ethInput || Number(ethInput) <= 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px', fontWeight: 600, transition: 'background 0.2s',
                  }}
                >
                  {buyPending ? 'Confirming on Base…' : 'Buy CONV Tokens'}
                </button>

                {txHash && (
                  <div style={{
                    marginTop: '14px', padding: '12px 16px', borderRadius: '8px',
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                    fontSize: '13px', color: '#10b981',
                  }}>
                    Transaction confirmed!{' '}
                    <a
                      href={`https://sepolia.basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#10b981', fontWeight: 600 }}
                    >
                      View on Base Sepolia Explorer
                    </a>
                  </div>
                )}

                {(txError || buyError) && (
                  <div style={{
                    marginTop: '14px', padding: '12px 16px', borderRadius: '8px',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    fontSize: '13px', color: '#f87171',
                  }}>
                    {txError ?? buyError?.message ?? 'Unknown error'}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{
            background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: '12px', padding: '24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎓</div>
            <p style={{ fontSize: '15px', color: '#fbbf24', fontWeight: 600, margin: '0 0 6px' }}>
              This token has graduated to an on-chain DEX
            </p>
            <p style={{ fontSize: '13px', color: '#78716c', margin: 0 }}>
              Trade on Aerodrome — builder fund released for milestone-based delivery
            </p>
          </div>
        )}

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <div style={{
          marginTop: '32px', background: '#0d0d0d', border: '1px solid #1a1a1a',
          borderRadius: '12px', padding: '20px',
        }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            How It Works
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { icon: '🗳️', text: 'Community votes on ideas in 69-hour windows. 69%+ approval = idea wins.' },
              { icon: '📈', text: 'Winning idea launches a bonding curve. Buy early = lower price. Every purchase pushes price up.' },
              { icon: '🎓', text: 'At 20 ETH raised the curve graduates: liquidity moves to Aerodrome DEX on Base.' },
              { icon: '🏗️', text: '15% of raised ETH goes to the BuildFund. Builder unlocks it milestone by milestone.' },
            ].map(({ icon, text }, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px', lineHeight: 1.4 }}>{icon}</span>
                <span style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>{text}</span>
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
      background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #1e1e1e', padding: '0 24px', height: '56px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/feed" style={{ textDecoration: 'none', fontWeight: 700, fontSize: '18px', color: '#6366f1' }}>
          pitchdrop
        </Link>
        <Link href="/feed" style={{ textDecoration: 'none', fontSize: '13px', color: '#64748b' }}>
          ← Back to Feed
        </Link>
        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
          Token Market · #{ideaId}
        </span>
      </div>
      <AuthButton />
    </nav>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>
        {value}
      </span>
    </div>
  )
}
