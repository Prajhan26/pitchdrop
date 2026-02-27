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
  // formatEther gives 18-decimal representation; show up to 4 decimals
  const str = formatEther(raw)
  const num = Number(str)
  if (num === 0) return '0'
  if (num < 0.0001) return '<0.0001'
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function progressPct(totalRaised: bigint | undefined, target: bigint | undefined): number {
  if (!totalRaised || !target || target === 0n) return 0
  const pct = Number((totalRaised * 10000n) / target) / 100
  return Math.min(pct, 100)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TokenMarketPage() {
  const params       = useParams<{ ideaId: string }>()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()

  const ideaId    = params.ideaId
  const curveParam = searchParams.get('curve')
  const curveAddress = curveParam ? (curveParam as `0x${string}`) : undefined

  const { totalRaised, graduated, graduationTarget } = useBondingCurve(curveAddress)

  const [ethInput, setEthInput] = useState('')
  const { tokensOut, isLoading: quoteLoading } = useTokensForEth(curveAddress, ethInput)
  const { buy, isPending: buyPending, error: buyError } = useBuyTokens(curveAddress)

  const [txHash, setTxHash] = useState<string | undefined>()
  const [txError, setTxError] = useState<string | undefined>()

  const pct     = progressPct(totalRaised, graduationTarget)
  const tokenName = `PITCH #${ideaId}`

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

  // ─── No curve deployed ──────────────────────────────────────────────────────

  if (!curveAddress) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f1f5f9' }}>
        <Nav ideaId={ideaId} />
        <main style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 24px' }}>
          <div style={{
            background:   '#111',
            border:       '1px solid #1e1e1e',
            borderRadius: '16px',
            padding:      '48px 32px',
            textAlign:    'center',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>&#9688;</div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#f1f5f9' }}>
              Bonding curve not yet launched for this idea
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Pass a <code style={{ color: '#94a3b8' }}>?curve=0x...</code> query param or wait for the curve to be deployed.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // ─── Main layout ────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f1f5f9' }}>
      <Nav ideaId={ideaId} />

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#f1f5f9' }}>
              {tokenName}
            </h1>
            {graduated !== undefined && (
              <span style={{
                padding:      '4px 12px',
                borderRadius: '999px',
                fontSize:     '12px',
                fontWeight:   700,
                background:   graduated ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                color:        graduated ? '#10b981' : '#6366f1',
                border:       `1px solid ${graduated ? 'rgba(16,185,129,0.35)' : 'rgba(99,102,241,0.35)'}`,
              }}>
                {graduated ? 'Graduated' : 'Active'}
              </span>
            )}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#64748b' }}>
            Conviction token bonding curve — 20 ETH graduation target
          </p>
        </div>

        {/* ── Graduated banner ──────────────────────────────────────────────── */}
        {graduated && (
          <div style={{
            background:   'rgba(16,185,129,0.1)',
            border:       '1px solid rgba(16,185,129,0.3)',
            borderRadius: '12px',
            padding:      '16px 20px',
            marginBottom: '28px',
            fontSize:     '14px',
            color:        '#10b981',
            fontWeight:   500,
          }}>
            Graduated — token trading on DEX
          </div>
        )}

        {/* ── Graduation progress bar ───────────────────────────────────────── */}
        <div style={{
          background:   '#111',
          border:       '1px solid #1e1e1e',
          borderRadius: '12px',
          padding:      '20px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
              Graduation Progress
            </span>
            <span style={{ fontSize: '13px', color: '#f1f5f9', fontWeight: 600 }}>
              {pct.toFixed(1)}%
            </span>
          </div>

          {/* Track */}
          <div style={{
            height:       '10px',
            background:   '#1e1e1e',
            borderRadius: '999px',
            overflow:     'hidden',
            marginBottom: '10px',
          }}>
            <div style={{
              height:       '100%',
              width:        `${pct}%`,
              background:   graduated ? '#10b981' : 'linear-gradient(90deg, #6366f1, #10b981)',
              borderRadius: '999px',
              transition:   'width 0.4s ease',
            }} />
          </div>

          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {totalRaised !== undefined
              ? `${formatEther(totalRaised)} ETH raised`
              : '— ETH raised'}{' '}
            of{' '}
            {graduationTarget !== undefined
              ? `${formatEther(graduationTarget)} ETH`
              : '20 ETH'}{' '}
            target
          </p>
        </div>

        {/* ── Stats cards ───────────────────────────────────────────────────── */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap:                 '12px',
          marginBottom:        '28px',
        }}>
          <StatCard
            label="Total Raised"
            value={totalRaised !== undefined ? `${formatEther(totalRaised)} ETH` : '—'}
          />
          <StatCard
            label="Progress"
            value={`${pct.toFixed(1)}%`}
          />
          <StatCard
            label="Build Fund"
            value="15% on graduation"
          />
        </div>

        {/* ── Buy panel ─────────────────────────────────────────────────────── */}
        {!graduated && (
          <>
            {!isAuthenticated ? (
              <div style={{
                background:   '#111',
                border:       '1px solid #1e1e1e',
                borderRadius: '12px',
                padding:      '32px',
                textAlign:    'center',
              }}>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                  Connect your wallet to buy tokens
                </p>
                <AuthButton />
              </div>
            ) : (
              <div style={{
                background:   '#111',
                border:       '1px solid #1e1e1e',
                borderRadius: '12px',
                padding:      '24px',
              }}>
                <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>
                  Buy Tokens
                </h2>

                {/* ETH input */}
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                  ETH Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0.0"
                  value={ethInput}
                  onChange={e => setEthInput(e.target.value)}
                  style={{
                    width:        '100%',
                    boxSizing:    'border-box',
                    padding:      '10px 14px',
                    borderRadius: '8px',
                    border:       '1px solid #2a2a2a',
                    background:   '#0a0a0a',
                    color:        '#f1f5f9',
                    fontSize:     '15px',
                    outline:      'none',
                    marginBottom: '12px',
                  }}
                />

                {/* Live quote */}
                <div style={{
                  padding:      '10px 14px',
                  borderRadius: '8px',
                  background:   '#0f0f0f',
                  border:       '1px solid #1e1e1e',
                  marginBottom: '12px',
                  fontSize:     '13px',
                  color:        '#94a3b8',
                }}>
                  {quoteLoading
                    ? 'Calculating…'
                    : tokensOut !== undefined
                      ? <>You receive: <strong style={{ color: '#f1f5f9' }}>{formatTokens(tokensOut)} CONV</strong> tokens</>
                      : <>Enter an ETH amount to see estimated tokens</>
                  }
                </div>

                {/* Slippage note */}
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#475569' }}>
                  5% slippage protection applied automatically
                </p>

                {/* Buy button */}
                <button
                  onClick={handleBuy}
                  disabled={buyPending || !ethInput || Number(ethInput) <= 0}
                  style={{
                    width:        '100%',
                    padding:      '12px',
                    borderRadius: '8px',
                    border:       'none',
                    background:   buyPending || !ethInput || Number(ethInput) <= 0
                      ? '#1e1e1e'
                      : '#6366f1',
                    color:        buyPending || !ethInput || Number(ethInput) <= 0
                      ? '#475569'
                      : '#fff',
                    cursor:       buyPending || !ethInput || Number(ethInput) <= 0
                      ? 'not-allowed'
                      : 'pointer',
                    fontSize:     '14px',
                    fontWeight:   600,
                    transition:   'background 0.2s',
                  }}
                >
                  {buyPending ? 'Sending transaction…' : 'Buy Tokens'}
                </button>

                {/* Success */}
                {txHash && (
                  <div style={{
                    marginTop:    '14px',
                    padding:      '12px 16px',
                    borderRadius: '8px',
                    background:   'rgba(16,185,129,0.08)',
                    border:       '1px solid rgba(16,185,129,0.25)',
                    fontSize:     '13px',
                    color:        '#10b981',
                  }}>
                    Transaction sent!{' '}
                    <a
                      href={`https://basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#10b981', fontWeight: 600 }}
                    >
                      View on Base Explorer
                    </a>
                  </div>
                )}

                {/* Error */}
                {(txError || buyError) && (
                  <div style={{
                    marginTop:    '14px',
                    padding:      '12px 16px',
                    borderRadius: '8px',
                    background:   'rgba(239,68,68,0.08)',
                    border:       '1px solid rgba(239,68,68,0.25)',
                    fontSize:     '13px',
                    color:        '#f87171',
                  }}>
                    {txError ?? buyError?.message ?? 'Unknown error'}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Nav({ ideaId }: { ideaId: string }) {
  return (
    <nav style={{
      position:       'sticky',
      top:            0,
      zIndex:         50,
      background:     'rgba(10,10,10,0.9)',
      backdropFilter: 'blur(8px)',
      borderBottom:   '1px solid #1e1e1e',
      padding:        '0 24px',
      height:         '56px',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link
          href="/feed"
          style={{ textDecoration: 'none', fontWeight: 700, fontSize: '18px', color: '#6366f1' }}
        >
          pitchdrop
        </Link>
        <Link
          href="/feed"
          style={{ textDecoration: 'none', fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          &#8592; Back
        </Link>
        <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
          Token Market
        </span>
      </div>
      <AuthButton />
    </nav>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background:   '#111',
      border:       '1px solid #1e1e1e',
      borderRadius: '12px',
      padding:      '16px',
      display:      'flex',
      flexDirection:'column',
      gap:          '6px',
    }}>
      <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>
        {value}
      </span>
    </div>
  )
}
