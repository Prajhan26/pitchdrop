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
  if (num >= 1_000)     return `${(num / 1_000).toFixed(2)}K`
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
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

  const ideaId       = params.ideaId
  const curveParam   = searchParams.get('curve')
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
        <main style={{ maxWidth: '680px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '40px', margin: '0 0 16px' }}>⏳</p>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f1f5f9', margin: '0 0 8px' }}>
            Token not live yet
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Trading opens automatically once this idea reaches 69% community approval.
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
        <main style={{ maxWidth: '680px', margin: '0 auto', padding: '60px 24px' }}>
          <div style={{
            background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: '16px', padding: '40px 32px', textAlign: 'center',
          }}>
            <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🎓</p>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fbbf24', margin: '0 0 10px' }}>
              Token graduated to Aerodrome DEX
            </h2>
            <p style={{ fontSize: '14px', color: '#78716c', margin: '0 0 24px', lineHeight: 1.6 }}>
              The bonding curve raised its target. Liquidity has migrated to Aerodrome on Base.
              The builder has received their milestone funding — now they build.
            </p>
            <a
              href="https://aerodrome.finance"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block', padding: '10px 24px', borderRadius: '8px',
                background: '#fbbf24', color: '#0a0a0a', fontWeight: 700, fontSize: '14px',
                textDecoration: 'none',
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

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ── Badge + headline ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
              background: 'rgba(16,185,129,0.12)', color: '#10b981',
              border: '1px solid rgba(16,185,129,0.3)',
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%', background: '#10b981',
                display: 'inline-block', animation: 'pulse 2s infinite',
              }} />
              Trading Live
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
              background: 'rgba(99,102,241,0.12)', color: '#6366f1',
              border: '1px solid rgba(99,102,241,0.3)',
            }}>
              ✓ 69%+ Community Approved
            </span>
          </div>

          <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700, color: '#f1f5f9' }}>
            CONV Token · Pitch #{ideaId}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
            This idea won the community vote and its conviction token is now live for trading.
            Buy in at the current bonding curve price — every purchase pushes the price up.
            When the curve hits 20 ETH, the token automatically migrates to Aerodrome DEX
            and the builder receives milestone funding.
          </p>
        </div>

        {/* ── Buy panel ─────────────────────────────────────────────────────── */}
        <div style={{
          background: '#111', border: '1px solid #222', borderRadius: '16px',
          padding: '24px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>
              Buy CONV Tokens
            </h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              on Base Sepolia · bonding curve
            </span>
          </div>

          {!isAuthenticated ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                Connect wallet to trade
              </p>
              <AuthButton />
            </div>
          ) : (
            <>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                You pay (ETH)
              </label>
              <input
                type="number"
                min="0"
                step="0.001"
                placeholder="0.01"
                value={ethInput}
                onChange={e => setEthInput(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid #2a2a2a', background: '#0a0a0a',
                  color: '#f1f5f9', fontSize: '16px', outline: 'none', marginBottom: '10px',
                }}
              />

              <div style={{
                padding: '12px 14px', borderRadius: '10px',
                background: '#0d0d0d', border: '1px solid #1e1e1e',
                marginBottom: '16px', fontSize: '14px', color: '#94a3b8',
              }}>
                {quoteLoading
                  ? 'Calculating…'
                  : tokensOut !== undefined
                    ? <>You receive: <strong style={{ color: '#f1f5f9', fontSize: '16px' }}>{formatTokens(tokensOut)} CONV</strong></>
                    : 'Enter an amount to see your quote'
                }
              </div>

              <button
                onClick={handleBuy}
                disabled={buyPending || !ethInput || Number(ethInput) <= 0}
                style={{
                  width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                  background: buyPending || !ethInput || Number(ethInput) <= 0 ? '#1e1e1e' : '#6366f1',
                  color:      buyPending || !ethInput || Number(ethInput) <= 0 ? '#475569' : '#fff',
                  cursor:     buyPending || !ethInput || Number(ethInput) <= 0 ? 'not-allowed' : 'pointer',
                  fontSize: '15px', fontWeight: 700, transition: 'background 0.15s',
                }}
              >
                {buyPending ? 'Confirming on Base…' : 'Buy Now'}
              </button>

              <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#374151', textAlign: 'center' }}>
                5% slippage protection · price rises with every buy
              </p>

              {txHash && (
                <div style={{
                  marginTop: '14px', padding: '12px 16px', borderRadius: '10px',
                  background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
                  fontSize: '13px', color: '#10b981',
                }}>
                  Confirmed!{' '}
                  <a
                    href={`https://sepolia.basescan.org/tx/${txHash}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: '#10b981', fontWeight: 600 }}
                  >
                    View on Basescan →
                  </a>
                </div>
              )}
              {(txError || buyError) && (
                <div style={{
                  marginTop: '14px', padding: '12px 16px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: '13px', color: '#f87171',
                }}>
                  {txError ?? buyError?.message ?? 'Unknown error'}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px',
        }}>
          <StatCard
            label="ETH Raised"
            value={totalRaised !== undefined ? `${Number(formatEther(totalRaised)).toFixed(4)} ETH` : '—'}
            sub="of 20 ETH target"
          />
          <StatCard
            label="Builder Fund"
            value="15%"
            sub="unlocked at graduation"
          />
          <StatCard
            label="After Graduation"
            value="Aerodrome DEX"
            sub="liquidity migrates auto"
          />
        </div>

        {/* ── Graduation milestone bar ───────────────────────────────────────── */}
        <div style={{
          background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Graduation milestone
            </span>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              {pct.toFixed(2)}% of 20 ETH
            </span>
          </div>
          <div style={{
            height: '6px', background: '#1a1a1a', borderRadius: '999px',
            overflow: 'hidden', marginBottom: '8px',
          }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)',
              borderRadius: '999px', transition: 'width 0.4s ease',
              minWidth: pct > 0 ? '4px' : '0',
            }} />
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
            When the curve reaches 20 ETH — token migrates to Aerodrome DEX,
            15% goes to the builder&apos;s milestone fund, rest becomes DEX liquidity.
          </p>
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
        <Link href="/feed" style={{ textDecoration: 'none', fontSize: '13px', color: '#475569' }}>
          ← Feed
        </Link>
        <span style={{ fontSize: '13px', color: '#64748b' }}>Token Market</span>
      </div>
      <AuthButton />
    </nav>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{
      background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '14px 16px',
    }}>
      <div style={{ fontSize: '11px', color: '#374151', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '3px' }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#374151' }}>{sub}</div>
    </div>
  )
}
