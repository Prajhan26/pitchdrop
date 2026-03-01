'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCountdown, getPhaseInfo, useCastVote, useVoterRecord, type ApiIdea } from '../hooks/useIdeas'
import { useAuth } from '../hooks/useAuth'
import { useCastVoteOnChain, ENGINE_ADDRESS } from '../hooks/useContracts'

interface IdeaCardProps {
  idea: ApiIdea
}

export function IdeaCard({ idea }: IdeaCardProps) {
  const { isAuthenticated, walletAddress, login } = useAuth()
  const { mutate: castVoteOffchain, isPending: isApiPending, isError, error } = useCastVote()
  const { castVote: castVoteOnchain, isPending: isChainPending }              = useCastVoteOnChain()

  const { data: voteData } = useVoterRecord(idea.id, walletAddress ?? undefined)
  const hasVoted = voteData?.voted ?? false
  const myVote   = voteData?.vote?.direction

  const phase    = getPhaseInfo(idea.publishedAt)
  const [countdown, setCountdown]   = useState(() => formatCountdown(idea.closesAt))
  const [showAnalysis, setShowAnalysis] = useState(false)

  useEffect(() => {
    if (idea.status !== 'active') return
    const id = setInterval(() => setCountdown(formatCountdown(idea.closesAt)), 1_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea.closesAt, idea.status])

  const totalWeight = idea.yesWeight + idea.noWeight
  const yesPercent  = totalWeight > 0 ? Math.round((idea.yesWeight / totalWeight) * 100) : 50
  const noPercent   = 100 - yesPercent
  const isPending   = isApiPending || isChainPending
  const isClosed    = idea.status !== 'active'

  const canVoteOnChain =
    !!ENGINE_ADDRESS &&
    !!idea.onchainId &&
    !idea.onchainId.startsWith('pending')

  async function handleVote(direction: 'yes' | 'no') {
    if (!isAuthenticated) { login(); return }
    if (!walletAddress)   return
    if (canVoteOnChain) {
      try {
        const txHash = await castVoteOnchain(idea.onchainId, direction)
        castVoteOffchain({ ideaId: idea.id, voterAddr: walletAddress, direction, txHash })
      } catch { /* wallet rejection */ }
    } else {
      castVoteOffchain({ ideaId: idea.id, voterAddr: walletAddress, direction })
    }
  }

  const isWon = idea.status === 'won'
  const hasAnalysis = !!(idea.bullCase || idea.bearCase)

  return (
    <article style={{
      ...cardStyle,
      ...(isWon ? { border: '1px solid rgba(99,102,241,0.3)', background: '#0f0f18' } : {}),
    }}>

      {/* Token live banner for won ideas */}
      {isWon && idea.curveAddr && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderRadius: '8px',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
          marginBottom: '2px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>Token live — trading now on Base</span>
          </div>
          <Link
            href={`/token/${idea.onchainId}?curve=${idea.curveAddr}`}
            style={{
              fontSize: '12px', fontWeight: 700, color: '#fff',
              background: '#10b981', padding: '4px 12px',
              borderRadius: '6px', textDecoration: 'none',
            }}
          >
            Buy →
          </Link>
        </div>
      )}

      {/* Header row */}
      <div style={headerRowStyle}>
        <span style={{ ...phaseBadgeStyle, background: phase.color }}>
          {phase.label} {phase.multiplier}
        </span>
        <span style={categoryStyle}>{idea.category}</span>
        <span style={countdownStyle}>{isClosed ? statusLabel(idea.status) : countdown}</span>
      </div>

      {/* Title */}
      <h2 style={titleStyle}>{idea.title}</h2>

      {/* Description */}
      <p style={descStyle}>{truncate(idea.description, 160)}</p>

      {/* Founder + vote count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={founderStyle}>
          {idea.isAnonymous
            ? 'by anonymous'
            : idea.founderAddr
              ? `by ${idea.founderAddr.slice(0, 6)}…${idea.founderAddr.slice(-4)}`
              : null}
        </p>
        {(idea.voteCount ?? 0) > 0 && (
          <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
            {idea.voteCount} voter{idea.voteCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* PMF score badge for resolved ideas */}
      {idea.pmfScore != null && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '8px', alignSelf: 'flex-start',
          background: idea.pmfScore >= 70 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${idea.pmfScore >= 70 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}>
          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.04em' }}>EIGEN PMF</span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>score</span>
          <span style={{ fontSize: '14px', fontWeight: 800, color: idea.pmfScore >= 70 ? '#10b981' : '#ef4444' }}>
            {idea.pmfScore}
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>/100</span>
        </div>
      )}

      {/* Weight bar */}
      <div style={barContainerStyle}>
        <div style={{ ...yesBarStyle, width: `${yesPercent}%` }} />
        <div style={{ ...noBarStyle,  width: `${noPercent}%`  }} />
      </div>
      <div style={barLabelsStyle}>
        <span style={{ color: '#10b981' }}>YES {yesPercent}%</span>
        <span style={{ color: '#ef4444' }}>NO {noPercent}%</span>
      </div>

      {/* Bull / Bear analysis toggle */}
      {hasAnalysis && (
        <div>
          <button
            onClick={() => setShowAnalysis(v => !v)}
            style={{
              background: 'transparent', border: '1px solid #222',
              borderRadius: '6px', padding: '5px 12px',
              fontSize: '11px', fontWeight: 700, color: '#94a3b8',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              fontFamily: 'monospace', letterSpacing: '0.04em',
            }}
          >
            <span>⚡ EIGEN ANALYSIS</span>
            <span style={{ color: '#64748b' }}>{showAnalysis ? '▲' : '▼'}</span>
          </button>

          {showAnalysis && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {idea.bullCase && (
                <div style={{
                  padding: '10px 12px', borderRadius: '8px',
                  background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    BULL CASE
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6ee7b7', lineHeight: 1.55 }}>
                    {idea.bullCase}
                  </p>
                </div>
              )}
              {idea.bearCase && (
                <div style={{
                  padding: '10px 12px', borderRadius: '8px',
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    BEAR CASE
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#fca5a5', lineHeight: 1.55 }}>
                    {idea.bearCase}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Vote buttons */}
      {!isClosed && (
        <div style={voteRowStyle}>
          {hasVoted ? (
            <p style={votedStyle}>
              You voted <strong style={{ color: myVote === 'yes' ? '#10b981' : '#ef4444' }}>
                {myVote?.toUpperCase()}
              </strong>
            </p>
          ) : (
            <>
              <button onClick={() => handleVote('yes')} disabled={isPending} style={{ ...voteButtonStyle, ...yesButtonStyle }}>
                {isPending ? '…' : '👍 YES'}
              </button>
              <button onClick={() => handleVote('no')} disabled={isPending} style={{ ...voteButtonStyle, ...noButtonStyle }}>
                {isPending ? '…' : '👎 NO'}
              </button>
            </>
          )}
          {isError && <p style={errorStyle}>{(error as Error).message}</p>}
        </div>
      )}
    </article>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + '…' : s
}

function statusLabel(status: string) {
  if (status === 'won')       return '✅ Won'
  if (status === 'graveyard') return '⚰️ Graveyard'
  return status
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#111', border: '1px solid #222', borderRadius: '12px',
  padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px',
}
const headerRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
}
const phaseBadgeStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, padding: '3px 8px',
  borderRadius: '4px', color: '#fff', letterSpacing: '0.04em',
}
const categoryStyle: React.CSSProperties = {
  fontSize: '12px', color: '#888', border: '1px solid #333',
  borderRadius: '4px', padding: '2px 8px',
}
const countdownStyle: React.CSSProperties = {
  marginLeft: 'auto', fontSize: '12px', color: '#888', fontFamily: 'monospace',
}
const titleStyle: React.CSSProperties = {
  fontSize: '17px', fontWeight: 600, lineHeight: 1.35, margin: 0,
}
const descStyle: React.CSSProperties = {
  fontSize: '14px', color: '#aaa', lineHeight: 1.55, margin: 0,
}
const founderStyle: React.CSSProperties = {
  fontSize: '12px', color: '#666', fontFamily: 'monospace', margin: 0,
}
const barContainerStyle: React.CSSProperties = {
  display: 'flex', height: '6px', borderRadius: '3px',
  overflow: 'hidden', background: '#222',
}
const yesBarStyle: React.CSSProperties = { background: '#10b981', transition: 'width 0.4s ease' }
const noBarStyle:  React.CSSProperties = { background: '#ef4444', transition: 'width 0.4s ease' }
const barLabelsStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600,
}
const voteRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap',
}
const voteButtonStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: '8px', border: 'none',
  cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'opacity 0.15s',
}
const yesButtonStyle: React.CSSProperties = { background: '#10b981', color: '#fff' }
const noButtonStyle:  React.CSSProperties = { background: '#ef4444', color: '#fff' }
const votedStyle: React.CSSProperties = { fontSize: '13px', color: '#888', margin: 0 }
const errorStyle: React.CSSProperties = { fontSize: '12px', color: '#ef4444', margin: 0 }
