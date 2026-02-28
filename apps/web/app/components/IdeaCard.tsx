'use client'

import { useState, useEffect } from 'react'
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

  const { data: voteData } = useVoterRecord(
    idea.id,
    walletAddress ?? undefined,
  )
  const hasVoted = voteData?.voted ?? false
  const myVote   = voteData?.vote?.direction

  const phase    = getPhaseInfo(idea.publishedAt)
  const [countdown, setCountdown] = useState(() => formatCountdown(idea.closesAt))

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

  // Use on-chain voting when ENGINE_ADDRESS is set and idea has a confirmed onchainId
  const canVoteOnChain =
    !!ENGINE_ADDRESS &&
    !!idea.onchainId &&
    !idea.onchainId.startsWith('pending')

  async function handleVote(direction: 'yes' | 'no') {
    if (!isAuthenticated) { login(); return }
    if (!walletAddress)   return
    if (canVoteOnChain) {
      // On-chain path: submit tx → record txHash in indexer
      try {
        const txHash = await castVoteOnchain(idea.onchainId, direction)
        castVoteOffchain({ ideaId: idea.id, voterAddr: walletAddress, direction, txHash })
      } catch {
        // wallet rejection or revert — error displayed via isError
      }
    } else {
      // Off-chain path: indexer only (pre-deployment or pending onchainId)
      castVoteOffchain({ ideaId: idea.id, voterAddr: walletAddress, direction })
    }
  }

  return (
    <article style={cardStyle}>
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

      {/* Founder */}
      {!idea.isAnonymous && idea.founderAddr && (
        <p style={founderStyle}>
          by {idea.founderAddr.slice(0, 6)}…{idea.founderAddr.slice(-4)}
        </p>
      )}
      {idea.isAnonymous && <p style={founderStyle}>by anonymous</p>}

      {/* PMF score badge for resolved ideas */}
      {idea.pmfScore != null && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '8px', alignSelf: 'flex-start',
          background: idea.pmfScore >= 70 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${idea.pmfScore >= 70 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}>
          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>⚡ EIGEN AGENT PMF</span>
          <span style={{
            fontSize: '14px', fontWeight: 800,
            color: idea.pmfScore >= 70 ? '#10b981' : '#ef4444',
          }}>
            {idea.pmfScore}
          </span>
          <span style={{ fontSize: '11px', color: '#475569' }}>/100</span>
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
              <button
                onClick={() => handleVote('yes')}
                disabled={isPending}
                style={{ ...voteButtonStyle, ...yesButtonStyle }}
              >
                {isPending ? '…' : '👍 YES'}
              </button>
              <button
                onClick={() => handleVote('no')}
                disabled={isPending}
                style={{ ...voteButtonStyle, ...noButtonStyle }}
              >
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

// ─── Helpers ───────────────────────────────────────────────────────────────

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + '…' : s
}

function statusLabel(status: string) {
  if (status === 'won')       return '✅ Won'
  if (status === 'graveyard') return '⚰️ Graveyard'
  return status
}

// ─── Styles ────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background:   '#111',
  border:       '1px solid #222',
  borderRadius: '12px',
  padding:      '20px',
  display:      'flex',
  flexDirection: 'column',
  gap:          '12px',
}

const headerRowStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        '8px',
  flexWrap:   'wrap',
}

const phaseBadgeStyle: React.CSSProperties = {
  fontSize:     '11px',
  fontWeight:   700,
  padding:      '3px 8px',
  borderRadius: '4px',
  color:        '#fff',
  letterSpacing: '0.04em',
}

const categoryStyle: React.CSSProperties = {
  fontSize:     '12px',
  color:        '#888',
  border:       '1px solid #333',
  borderRadius: '4px',
  padding:      '2px 8px',
}

const countdownStyle: React.CSSProperties = {
  marginLeft: 'auto',
  fontSize:   '12px',
  color:      '#888',
  fontFamily: 'monospace',
}

const titleStyle: React.CSSProperties = {
  fontSize:   '17px',
  fontWeight: 600,
  lineHeight: 1.35,
  margin:     0,
}

const descStyle: React.CSSProperties = {
  fontSize:   '14px',
  color:      '#aaa',
  lineHeight: 1.55,
  margin:     0,
}

const founderStyle: React.CSSProperties = {
  fontSize:   '12px',
  color:      '#666',
  fontFamily: 'monospace',
  margin:     0,
}

const barContainerStyle: React.CSSProperties = {
  display:      'flex',
  height:       '6px',
  borderRadius: '3px',
  overflow:     'hidden',
  background:   '#222',
}

const yesBarStyle: React.CSSProperties = {
  background:   '#10b981',
  transition:   'width 0.4s ease',
}

const noBarStyle: React.CSSProperties = {
  background:   '#ef4444',
  transition:   'width 0.4s ease',
}

const barLabelsStyle: React.CSSProperties = {
  display:        'flex',
  justifyContent: 'space-between',
  fontSize:       '12px',
  fontWeight:     600,
}

const voteRowStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        '10px',
  marginTop:  '4px',
  flexWrap:   'wrap',
}

const voteButtonStyle: React.CSSProperties = {
  padding:      '8px 20px',
  borderRadius: '8px',
  border:       'none',
  cursor:       'pointer',
  fontWeight:   600,
  fontSize:     '14px',
  transition:   'opacity 0.15s',
}

const yesButtonStyle: React.CSSProperties = {
  background: '#10b981',
  color:      '#fff',
}

const noButtonStyle: React.CSSProperties = {
  background: '#ef4444',
  color:      '#fff',
}

const votedStyle: React.CSSProperties = {
  fontSize: '13px',
  color:    '#888',
  margin:   0,
}

const errorStyle: React.CSSProperties = {
  fontSize: '12px',
  color:    '#ef4444',
  margin:   0,
}
