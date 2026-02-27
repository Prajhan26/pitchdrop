'use client'

import Link from 'next/link'
import { useAuth } from '../hooks/useAuth'
import { useAirdropEligibility } from '../hooks/useAirdrop'
import { useAirdropClaim, useHasClaimed, useMerkleRootSet } from '../hooks/useAirdropClaim'
import { AuthButton } from '../components/AuthButton'
import type { AirdropIdeaAllocation } from '../lib/api'

// ─── Tier config ──────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Early 3x', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  2: { label: 'Mid 2x',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  3: { label: 'Late 1x',  color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: number }) {
  const cfg = TIER_CONFIG[tier]
  if (!cfg) return null
  return (
    <span style={{
      display:       'inline-block',
      padding:       '2px 10px',
      borderRadius:  '999px',
      fontSize:      '12px',
      fontWeight:    600,
      color:         cfg.color,
      background:    cfg.bg,
      border:        `1px solid ${cfg.color}40`,
    }}>
      T{tier} {cfg.label}
    </span>
  )
}

// IdeaClaimRow calls hooks at component level (rules of hooks) and renders the claim button.
type IdeaClaimRowProps = {
  idea:          AirdropIdeaAllocation
  walletAddress: string | undefined
  tokenAddr:     string
}

function IdeaClaimRow({ idea, walletAddress, tokenAddr }: IdeaClaimRowProps) {
  const onchainId = idea.onchainId ?? ''

  const { data: hasClaimed } = useHasClaimed(onchainId, walletAddress)
  const rootIsSet            = useMerkleRootSet(onchainId)
  const airdropClaim         = useAirdropClaim()

  if (!idea.eligible) {
    return (
      <button
        disabled
        style={{
          padding:       '8px 16px',
          borderRadius:  '8px',
          border:        '1px solid #1e1e1e',
          background:    '#1a1a1a',
          color:         '#475569',
          cursor:        'not-allowed',
          fontSize:      '13px',
          fontWeight:    500,
        }}
      >
        Not eligible
      </button>
    )
  }

  if (!onchainId) {
    return (
      <button
        disabled
        style={{
          padding:       '8px 16px',
          borderRadius:  '8px',
          border:        '1px solid #1e1e1e',
          background:    '#1a1a1a',
          color:         '#475569',
          cursor:        'not-allowed',
          fontSize:      '13px',
          fontWeight:    500,
        }}
      >
        Merkle proof pending
      </button>
    )
  }

  if (hasClaimed) {
    return (
      <span style={{
        padding:       '8px 16px',
        borderRadius:  '8px',
        border:        '1px solid rgba(16,185,129,0.3)',
        background:    'rgba(16,185,129,0.08)',
        color:         '#10b981',
        fontSize:      '13px',
        fontWeight:    600,
        display:       'inline-block',
      }}>
        Claimed
      </span>
    )
  }

  if (!rootIsSet) {
    return (
      <button
        disabled
        title="Merkle proof pending"
        style={{
          padding:       '8px 16px',
          borderRadius:  '8px',
          border:        '1px solid #1e1e1e',
          background:    '#1a1a1a',
          color:         '#475569',
          cursor:        'not-allowed',
          fontSize:      '13px',
          fontWeight:    500,
        }}
      >
        Merkle proof pending
      </button>
    )
  }

  // Root is set and not yet claimed — show active Claim button
  return (
    <button
      disabled={airdropClaim.isPending || !airdropClaim.isAvailable}
      onClick={() =>
        airdropClaim.claim(
          onchainId,
          tokenAddr,
          BigInt(idea.allocation) * BigInt(1e18),
          [],
        )
      }
      style={{
        padding:       '8px 16px',
        borderRadius:  '8px',
        border:        'none',
        background:    airdropClaim.isPending ? '#1e1e1e' : '#6366f1',
        color:         airdropClaim.isPending ? '#475569' : '#fff',
        cursor:        airdropClaim.isPending ? 'not-allowed' : 'pointer',
        fontSize:      '13px',
        fontWeight:    600,
      }}
    >
      {airdropClaim.isPending ? 'Claiming…' : 'Claim'}
    </button>
  )
}

function IdeaCard({
  idea,
  walletAddress,
}: {
  idea:          AirdropIdeaAllocation
  walletAddress: string | undefined
}) {
  // tokenAddr placeholder — will be populated when real token addresses are available
  const tokenAddr = '0x0000000000000000000000000000000000000000'

  return (
    <div style={{
      background:   '#111',
      border:       '1px solid #1e1e1e',
      borderRadius: '12px',
      padding:      '20px',
      display:      'flex',
      flexDirection:'column',
      gap:          '12px',
    }}>
      {/* Title + PMF */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.4 }}>
          {idea.title}
        </h3>
        {idea.pmfScore !== null && (
          <span style={{
            flexShrink:    0,
            padding:       '2px 10px',
            borderRadius:  '999px',
            fontSize:      '12px',
            fontWeight:    700,
            color:         '#6366f1',
            background:    'rgba(99,102,241,0.12)',
            border:        '1px solid rgba(99,102,241,0.3)',
          }}>
            PMF {idea.pmfScore}
          </span>
        )}
      </div>

      {/* Eligibility */}
      {idea.eligible ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {idea.tier !== null && <TierBadge tier={idea.tier} />}
          <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>
              Your allocation:{' '}
              <strong style={{ color: '#f1f5f9' }}>
                {idea.allocation.toLocaleString()} CONV
              </strong>
            </span>
            <span>
              Your weight:{' '}
              <strong style={{ color: '#f1f5f9' }}>
                {idea.userWeight.toFixed(4)}
              </strong>
            </span>
          </div>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
          Not eligible for this idea
        </p>
      )}

      {/* Claim button — on-chain aware */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <IdeaClaimRow
          idea={idea}
          walletAddress={walletAddress}
          tokenAddr={tokenAddr}
        />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AirdropPage() {
  const { isAuthenticated, walletAddress } = useAuth()
  const { data, isLoading, isError, error } = useAirdropEligibility(
    walletAddress as string | undefined,
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f1f5f9' }}>

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link href="/feed" style={{ textDecoration: 'none', fontWeight: 700, fontSize: '18px', color: '#6366f1' }}>
            pitchdrop
          </Link>
          <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
            Airdrop
          </span>
        </div>
        <AuthButton />
      </nav>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px 80px' }}>

        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: '#f1f5f9' }}>
          Airdrop Eligibility
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '40px' }}>
          CONV token allocations for early scouts who voted YES on winning ideas.
        </p>

        {/* Not authenticated */}
        {!isAuthenticated && (
          <div style={{
            background:   '#111',
            border:       '1px solid #1e1e1e',
            borderRadius: '16px',
            padding:      '48px 32px',
            textAlign:    'center',
            maxWidth:     '480px',
            margin:       '0 auto',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>&#128300;</div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#f1f5f9' }}>
              Connect your wallet to check eligibility
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
              Sign in to see your CONV token allocation from winning idea votes.
            </p>
            <AuthButton />
          </div>
        )}

        {/* Authenticated */}
        {isAuthenticated && (
          <>
            {isLoading && (
              <p style={{ color: '#64748b', fontSize: '14px' }}>Loading eligibility data...</p>
            )}

            {isError && (
              <div style={{
                background:   'rgba(239,68,68,0.08)',
                border:       '1px solid rgba(239,68,68,0.25)',
                borderRadius: '12px',
                padding:      '16px 20px',
                color:        '#f87171',
                fontSize:     '14px',
              }}>
                Failed to load airdrop data:{' '}
                {error instanceof Error ? error.message : 'Unknown error'}
              </div>
            )}

            {data && (
              <>
                {/* Total allocation banner */}
                <div style={{
                  background:   'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.05) 100%)',
                  border:       '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '16px',
                  padding:      '28px 32px',
                  marginBottom: '32px',
                  textAlign:    'center',
                }}>
                  <div style={{ fontSize: '48px', fontWeight: 800, color: '#6366f1', letterSpacing: '-1px' }}>
                    {data.totalAllocation.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '16px', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>
                    CONV tokens eligible
                  </div>
                </div>

                {/* Empty state */}
                {data.totalAllocation === 0 && data.ideas.every(i => !i.eligible) && (
                  <div style={{
                    background:   '#111',
                    border:       '1px solid #1e1e1e',
                    borderRadius: '12px',
                    padding:      '40px 32px',
                    textAlign:    'center',
                    color:        '#475569',
                    fontSize:     '14px',
                  }}>
                    No eligible votes yet. Vote YES on active ideas to earn airdrop allocations.
                  </div>
                )}

                {/* Idea cards grid */}
                {data.ideas.length > 0 && (
                  <div style={{
                    display:             'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap:                 '16px',
                  }}>
                    {data.ideas.map(idea => (
                      <IdeaCard
                        key={idea.ideaId}
                        idea={idea}
                        walletAddress={walletAddress}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
