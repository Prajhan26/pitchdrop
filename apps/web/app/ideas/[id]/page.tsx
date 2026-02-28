'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  useIdea,
  useCastVote,
  useVoterRecord,
  formatCountdown,
  getPhaseInfo,
} from '../../hooks/useIdeas'
import { useAuth } from '../../hooks/useAuth'
import { AuthButton } from '../../components/AuthButton'
import type { ApiVote } from '../../lib/api'

export default function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated, walletAddress } = useAuth()

  const { data, isLoading, isError, error } = useIdea(id)
  const idea = data?.idea

  const castVote = useCastVote()
  const { data: voteData } = useVoterRecord(idea?.id ?? '', walletAddress ?? '')

  const hasVoted = voteData?.voted ?? false
  const myVote = voteData?.vote

  const phase = getPhaseInfo(idea?.publishedAt ?? null)

  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    if (!idea || idea.status !== 'active') return
    setCountdown(formatCountdown(idea.closesAt))
    const id = setInterval(() => setCountdown(formatCountdown(idea.closesAt)), 1_000)
    return () => clearInterval(id)
  }, [idea?.closesAt, idea?.status])

  const totalWeight = (idea?.yesWeight ?? 0) + (idea?.noWeight ?? 0)
  const yesPercent = totalWeight > 0 ? Math.round(((idea?.yesWeight ?? 0) / totalWeight) * 100) : 50
  const noPercent = 100 - yesPercent

  function handleVote(direction: 'yes' | 'no') {
    if (!idea || !walletAddress) return
    castVote.mutate({ ideaId: idea.id, voterAddr: walletAddress, direction })
  }

  function shortAddr(addr: string): string {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`
  }

  function statusBadgeText(status: string): string {
    if (status === 'active') return '🔥 Active'
    if (status === 'won') return '✅ Won'
    if (status === 'graveyard') return '⚰️ Graveyard'
    return status
  }

  function statusBadgeColor(status: string): string {
    if (status === 'active') return '#f97316'
    if (status === 'won') return '#10b981'
    if (status === 'graveyard') return '#666'
    return '#444'
  }

  return (
    <div style={pageStyle}>
      {/* Sticky Nav */}
      <header style={navStyle}>
        <Link href="/feed" style={logoStyle}>
          pitchdrop
        </Link>
        <Link href="/feed" style={backLinkStyle}>
          ← Back
        </Link>
        <div style={{ marginLeft: 'auto' }}>
          <AuthButton />
        </div>
      </header>

      <main style={mainStyle}>
        {isLoading && <p style={mutedStyle}>Loading idea…</p>}
        {isError && <p style={errorStyle}>{(error as Error).message}</p>}

        {idea && (
          <>
            {/* Hero section */}
            <section style={heroStyle}>
              <div style={badgeRowStyle}>
                <span style={categoryBadgeStyle}>{idea.category}</span>
                <span
                  style={{
                    ...statusBadgeStyle,
                    background: statusBadgeColor(idea.status),
                  }}
                >
                  {statusBadgeText(idea.status)}
                </span>
                {idea.curveAddr && (
                  <Link
                    href={`/token/${idea.onchainId}?curve=${idea.curveAddr}`}
                    style={tradeBadgeStyle}
                  >
                    Trade CONV
                  </Link>
                )}
              </div>

              <h1 style={heroTitleStyle}>{idea.title}</h1>

              <p style={heroDescStyle}>{idea.description}</p>

              <div style={heroMetaStyle}>
                {!idea.isAnonymous && idea.founderAddr ? (
                  <span style={founderStyle}>
                    by{' '}
                    <span style={{ fontFamily: 'monospace' }}>
                      {shortAddr(idea.founderAddr)}
                    </span>
                  </span>
                ) : (
                  <span style={founderStyle}>by anonymous</span>
                )}
                {idea.publishedAt && (
                  <span style={publishedStyle}>
                    {new Date(idea.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </section>

            {/* Stats row */}
            <section style={statsRowStyle}>
              <div style={statItemStyle}>
                <span style={{ ...statValueStyle, color: '#10b981' }}>
                  {idea.yesWeight.toLocaleString()}
                </span>
                <span style={statLabelStyle}>YES weight</span>
              </div>
              <div style={statItemStyle}>
                <span style={{ ...statValueStyle, color: '#ef4444' }}>
                  {idea.noWeight.toLocaleString()}
                </span>
                <span style={statLabelStyle}>NO weight</span>
              </div>
              <div style={statItemStyle}>
                <span
                  style={{
                    ...phaseBadgeStyle,
                    background: phase.color,
                  }}
                >
                  {phase.label} {phase.multiplier}
                </span>
                <span style={statLabelStyle}>Phase</span>
              </div>
              {idea.status === 'active' && (
                <div style={statItemStyle}>
                  <span style={{ ...statValueStyle, fontFamily: 'monospace', fontSize: '16px' }}>
                    {countdown || '…'}
                  </span>
                  <span style={statLabelStyle}>Remaining</span>
                </div>
              )}
            </section>

            {/* Vote weight bar */}
            <section style={barSectionStyle}>
              <div style={barContainerStyle}>
                <div style={{ ...yesBarStyle, width: `${yesPercent}%` }} />
                <div style={{ ...noBarStyle, width: `${noPercent}%` }} />
              </div>
              <div style={barLabelsStyle}>
                <span style={{ color: '#10b981', fontWeight: 600 }}>YES {yesPercent}%</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>NO {noPercent}%</span>
              </div>
            </section>

            {/* PMF Score card — only for won or graveyard */}
            {(idea.status === 'won' || idea.status === 'graveyard') &&
              idea.pmfScore !== null && (
                <section style={pmfCardStyle}>
                  <div style={pmfScoreStyle}>{idea.pmfScore}</div>
                  <div style={pmfLabelStyle}>PMF Score</div>
                  <div style={pmfDescStyle}>Product-Market Fit Score</div>
                </section>
              )}

            {/* Voting panel — only for active ideas */}
            {idea.status === 'active' && (
              <section style={votePanelStyle}>
                <h2 style={panelTitleStyle}>Cast Your Vote</h2>

                {!isAuthenticated ? (
                  <p style={mutedStyle}>Sign in to vote on this idea.</p>
                ) : hasVoted && myVote ? (
                  <div style={alreadyVotedStyle}>
                    <p style={alreadyVotedTextStyle}>
                      You voted{' '}
                      <strong
                        style={{
                          color: myVote.direction === 'yes' ? '#10b981' : '#ef4444',
                        }}
                      >
                        {myVote.direction.toUpperCase()}
                      </strong>{' '}
                      with weight{' '}
                      <strong style={{ color: '#ededed' }}>{myVote.weight}</strong>
                    </p>
                  </div>
                ) : (
                  <div style={voteButtonsRowStyle}>
                    <button
                      onClick={() => handleVote('yes')}
                      disabled={castVote.isPending}
                      style={{
                        ...voteButtonStyle,
                        background: castVote.isPending ? '#1a1a1a' : '#10b981',
                        color: castVote.isPending ? '#666' : '#fff',
                      }}
                    >
                      {castVote.isPending ? '…' : `Vote YES · ${phase.multiplier}`}
                    </button>
                    <button
                      onClick={() => handleVote('no')}
                      disabled={castVote.isPending}
                      style={{
                        ...voteButtonStyle,
                        background: castVote.isPending ? '#1a1a1a' : '#ef4444',
                        color: castVote.isPending ? '#666' : '#fff',
                      }}
                    >
                      {castVote.isPending ? '…' : `Vote NO · ${phase.multiplier}`}
                    </button>
                  </div>
                )}

                {castVote.isError && (
                  <p style={errorStyle}>{(castVote.error as Error).message}</p>
                )}
              </section>
            )}

            {/* Voter list */}
            {idea.votes && idea.votes.length > 0 && (
              <section style={voterListSectionStyle}>
                <h2 style={panelTitleStyle}>
                  Voters{' '}
                  <span style={{ color: '#666', fontWeight: 400 }}>
                    ({idea.votes.length})
                  </span>
                </h2>
                <div style={voterListStyle}>
                  {idea.votes.map((vote: ApiVote) => (
                    <VoterRow key={vote.id} vote={vote} />
                  ))}
                </div>
              </section>
            )}

            {idea.votes && idea.votes.length === 0 && (
              <section style={voterListSectionStyle}>
                <h2 style={panelTitleStyle}>Voters</h2>
                <p style={mutedStyle}>No votes yet. Be the first!</p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function VoterRow({ vote }: { vote: ApiVote }) {
  const isYes = vote.direction === 'yes'
  const timeAgo = formatTimeAgo(new Date(vote.castedAt))

  return (
    <div style={voterRowStyle}>
      <span style={voterAddrStyle}>
        {vote.voterAddr.slice(0, 6)}…{vote.voterAddr.slice(-4)}
      </span>
      <span
        style={{
          ...directionBadgeStyle,
          background: isYes ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          color: isYes ? '#10b981' : '#ef4444',
        }}
      >
        {vote.direction.toUpperCase()}
      </span>
      <span style={voterWeightStyle}>{vote.weight}×</span>
      <span style={voterTimeStyle}>{timeAgo}</span>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const ms = Date.now() - date.getTime()
  const min = Math.floor(ms / 60_000)
  const h = Math.floor(ms / 3_600_000)
  const d = Math.floor(ms / 86_400_000)
  if (d >= 1) return `${d}d ago`
  if (h >= 1) return `${h}h ago`
  if (min >= 1) return `${min}m ago`
  return 'just now'
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0a0a0a',
  color: '#ededed',
}

const navStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '16px 24px',
  borderBottom: '1px solid #1a1a1a',
  position: 'sticky',
  top: 0,
  background: '#0a0a0a',
  zIndex: 10,
}

const logoStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#ededed',
  textDecoration: 'none',
  flexShrink: 0,
}

const backLinkStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#888',
  textDecoration: 'none',
  padding: '6px 12px',
  borderRadius: '6px',
  border: '1px solid #222',
}

const mainStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '40px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '28px',
}

const heroStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
}

const badgeRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
}

const categoryBadgeStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#aaa',
  border: '1px solid #333',
  borderRadius: '4px',
  padding: '3px 10px',
}

const statusBadgeStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#fff',
  borderRadius: '4px',
  padding: '3px 10px',
  letterSpacing: '0.03em',
}

const tradeBadgeStyle: React.CSSProperties = {
  fontSize:       '12px',
  fontWeight:     600,
  color:          '#6366f1',
  textDecoration: 'none',
  borderRadius:   '4px',
  padding:        '3px 10px',
  border:         '1px solid rgba(99,102,241,0.4)',
  background:     'rgba(99,102,241,0.1)',
}

const heroTitleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 800,
  lineHeight: 1.25,
  margin: 0,
  color: '#ededed',
}

const heroDescStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#aaa',
  lineHeight: 1.65,
  margin: 0,
  whiteSpace: 'pre-wrap',
}

const heroMetaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  flexWrap: 'wrap',
}

const founderStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#666',
}

const publishedStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#555',
}

const statsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  flexWrap: 'wrap',
  background: '#111',
  border: '1px solid #1a1a1a',
  borderRadius: '12px',
  padding: '20px 24px',
}

const statItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  minWidth: '100px',
}

const statValueStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  lineHeight: 1,
}

const statLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const phaseBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: 700,
  padding: '4px 10px',
  borderRadius: '4px',
  color: '#fff',
  letterSpacing: '0.04em',
  alignSelf: 'flex-start',
}

const barSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const barContainerStyle: React.CSSProperties = {
  display: 'flex',
  height: '10px',
  borderRadius: '5px',
  overflow: 'hidden',
  background: '#222',
}

const yesBarStyle: React.CSSProperties = {
  background: '#10b981',
  transition: 'width 0.4s ease',
}

const noBarStyle: React.CSSProperties = {
  background: '#ef4444',
  transition: 'width 0.4s ease',
}

const barLabelsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13px',
}

const pmfCardStyle: React.CSSProperties = {
  background: '#111',
  border: '1px solid #1a1a1a',
  borderRadius: '12px',
  padding: '28px 32px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  textAlign: 'center',
}

const pmfScoreStyle: React.CSSProperties = {
  fontSize: '56px',
  fontWeight: 800,
  color: '#6366f1',
  lineHeight: 1,
}

const pmfLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#ccc',
}

const pmfDescStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#666',
}

const votePanelStyle: React.CSSProperties = {
  background: '#111',
  border: '1px solid #1a1a1a',
  borderRadius: '12px',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}

const panelTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  margin: 0,
  color: '#ccc',
}

const alreadyVotedStyle: React.CSSProperties = {
  background: '#1a1a1a',
  borderRadius: '8px',
  padding: '14px 18px',
}

const alreadyVotedTextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#aaa',
  margin: 0,
}

const voteButtonsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
}

const voteButtonStyle: React.CSSProperties = {
  flex: 1,
  minWidth: '140px',
  padding: '14px 24px',
  borderRadius: '10px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '15px',
  transition: 'opacity 0.15s',
  letterSpacing: '0.02em',
}

const voterListSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const voterListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const voterRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: '#111',
  border: '1px solid #1a1a1a',
  borderRadius: '8px',
  padding: '12px 16px',
  flexWrap: 'wrap',
}

const voterAddrStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '13px',
  color: '#aaa',
  flex: 1,
  minWidth: '120px',
}

const directionBadgeStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: '4px',
  letterSpacing: '0.05em',
}

const voterWeightStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#888',
  fontFamily: 'monospace',
}

const voterTimeStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#555',
  marginLeft: 'auto',
}

const mutedStyle: React.CSSProperties = {
  color: '#666',
  fontSize: '14px',
  margin: 0,
}

const errorStyle: React.CSSProperties = {
  color: '#ef4444',
  fontSize: '14px',
  margin: 0,
}
