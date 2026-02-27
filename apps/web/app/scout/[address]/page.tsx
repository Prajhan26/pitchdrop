'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useScout } from '../../hooks/useScout'
import { AuthButton } from '../../components/AuthButton'
import type { ScoutVote } from '../../lib/api'

export default function ScoutPage() {
  const { address } = useParams<{ address: string }>()
  const { data, isLoading, isError, error } = useScout(address)

  return (
    <div style={pageStyle}>
      {/* Nav */}
      <header style={navStyle}>
        <Link href="/feed" style={logoStyle}>pitchdrop</Link>
        <span style={navLabelStyle}>Scout Profile</span>
        <AuthButton />
      </header>

      <main style={mainStyle}>
        {isLoading && <p style={mutedStyle}>Loading profile…</p>}
        {isError   && <p style={errorStyle}>{(error as Error).message}</p>}

        {data && (
          <>
            {/* Identity */}
            <div style={identityStyle}>
              <div style={avatarStyle}>{address.slice(2, 4).toUpperCase()}</div>
              <div>
                <p style={addressStyle}>
                  {address.slice(0, 10)}…{address.slice(-8)}
                </p>
                <p style={mutedStyle}>
                  {data.stats.totalVotes === 0
                    ? 'No votes yet'
                    : `${data.stats.totalVotes} vote${data.stats.totalVotes !== 1 ? 's' : ''} cast`}
                </p>
              </div>
              <div style={scoreBadgeStyle}>
                <span style={scoreNumberStyle}>{data.stats.reputationScore}</span>
                <span style={scoreLabelStyle}>rep</span>
              </div>
            </div>

            {/* Stats grid */}
            <div style={statsGridStyle}>
              <StatCard label="Total Votes"    value={data.stats.totalVotes} />
              <StatCard label="Correct Calls"  value={data.stats.correctCalls} />
              <StatCard label="Accuracy"       value={`${Math.round(data.stats.accuracy * 100)}%`} />
              <StatCard label="Total Weight"   value={data.stats.totalWeight.toFixed(1)} />
              <StatCard label="Streak"         value={`${data.stats.streakDays}d 🔥`} />
              <StatCard label="Rep Score"      value={`${data.stats.reputationScore}/100`} />
            </div>

            {/* Tier breakdown */}
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Airdrop Tier Breakdown</h2>
              <div style={tiersRowStyle}>
                <TierBadge tier={1} label="Early 3×" count={data.stats.tier1Votes} color="#10b981" />
                <TierBadge tier={2} label="Mid 2×"   count={data.stats.tier2Votes} color="#f59e0b" />
                <TierBadge tier={3} label="Late 1×"  count={data.stats.tier3Votes} color="#f97316" />
              </div>
            </section>

            {/* Vote history */}
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Vote History</h2>
              {data.votes.length === 0 ? (
                <p style={mutedStyle}>No votes yet.</p>
              ) : (
                <div style={historyListStyle}>
                  {data.votes.map(vote => (
                    <VoteRow key={vote.id} vote={vote} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={statCardStyle}>
      <span style={statValueStyle}>{value}</span>
      <span style={statLabelStyle}>{label}</span>
    </div>
  )
}

function TierBadge({ tier, label, count, color }: { tier: number; label: string; count: number; color: string }) {
  return (
    <div style={{ ...tierBadgeStyle, borderColor: color }}>
      <span style={{ ...tierNumStyle, color }}>{tier === 1 ? '🥇' : tier === 2 ? '🥈' : '🥉'} {label}</span>
      <span style={tierCountStyle}>{count} vote{count !== 1 ? 's' : ''}</span>
    </div>
  )
}

function VoteRow({ vote }: { vote: ScoutVote }) {
  const isYes     = vote.direction === 'yes'
  const status    = vote.idea.status
  const isCorrect =
    (isYes && status === 'won') || (!isYes && status === 'graveyard')
  const isPending = status === 'active' || status === 'pending'

  const outcomeIcon  = isPending ? '⏳' : isCorrect ? '✅' : '❌'
  const outcomeLabel = isPending
    ? 'In progress'
    : isCorrect
    ? `Correct · PMF ${vote.idea.pmfScore ?? '–'}`
    : `Wrong · PMF ${vote.idea.pmfScore ?? '–'}`

  const timeAgo = formatTimeAgo(new Date(vote.castedAt))

  return (
    <div style={voteRowStyle}>
      <div style={voteRowLeftStyle}>
        <span style={outcomeIconStyle}>{outcomeIcon}</span>
        <div>
          <p style={voteTitleStyle}>{vote.idea.title}</p>
          <p style={voteMetaStyle}>
            <span style={{ color: isYes ? '#10b981' : '#ef4444', fontWeight: 700 }}>
              {vote.direction.toUpperCase()}
            </span>
            {' · Tier '}
            {vote.tier ?? '?'}
            {' · '}
            {vote.weight}× weight
            {' · '}
            {timeAgo}
          </p>
          <p style={{ ...voteMetaStyle, color: isPending ? '#888' : isCorrect ? '#10b981' : '#ef4444' }}>
            {outcomeLabel}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const ms  = Date.now() - date.getTime()
  const min = Math.floor(ms / 60_000)
  const h   = Math.floor(ms / 3_600_000)
  const d   = Math.floor(ms / 86_400_000)
  if (d  >= 1) return `${d}d ago`
  if (h  >= 1) return `${h}h ago`
  if (min >= 1) return `${min}m ago`
  return 'just now'
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight:  '100vh',
  background: '#0a0a0a',
  color:      '#ededed',
}

const navStyle: React.CSSProperties = {
  display:      'flex',
  alignItems:   'center',
  gap:          '12px',
  padding:      '16px 24px',
  borderBottom: '1px solid #1a1a1a',
  position:     'sticky',
  top:          0,
  background:   '#0a0a0a',
  zIndex:       10,
}

const logoStyle: React.CSSProperties = {
  fontSize:       '18px',
  fontWeight:     700,
  color:          '#ededed',
  textDecoration: 'none',
}

const navLabelStyle: React.CSSProperties = {
  flex:     1,
  fontSize: '13px',
  color:    '#555',
}

const mainStyle: React.CSSProperties = {
  maxWidth: '680px',
  margin:   '0 auto',
  padding:  '32px 24px',
  display:  'flex',
  flexDirection: 'column',
  gap:      '32px',
}

const mutedStyle: React.CSSProperties = { color: '#666', fontSize: '14px', margin: 0 }
const errorStyle: React.CSSProperties = { color: '#ef4444', fontSize: '14px' }

const identityStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        '16px',
}

const avatarStyle: React.CSSProperties = {
  width:        '48px',
  height:       '48px',
  borderRadius: '50%',
  background:   '#6366f1',
  display:      'flex',
  alignItems:   'center',
  justifyContent: 'center',
  fontWeight:   700,
  fontSize:     '16px',
  flexShrink:   0,
}

const addressStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize:   '15px',
  fontWeight: 600,
  margin:     0,
}

const scoreBadgeStyle: React.CSSProperties = {
  marginLeft:     'auto',
  display:        'flex',
  flexDirection:  'column',
  alignItems:     'center',
  background:     '#1a1a1a',
  border:         '1px solid #333',
  borderRadius:   '10px',
  padding:        '8px 16px',
}

const scoreNumberStyle: React.CSSProperties = {
  fontSize:   '24px',
  fontWeight: 800,
  color:      '#6366f1',
  lineHeight: 1,
}

const scoreLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  color:    '#888',
  marginTop: '2px',
}

const statsGridStyle: React.CSSProperties = {
  display:             'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap:                 '12px',
}

const statCardStyle: React.CSSProperties = {
  background:    '#111',
  border:        '1px solid #1e1e1e',
  borderRadius:  '10px',
  padding:       '16px',
  display:       'flex',
  flexDirection: 'column',
  gap:           '4px',
}

const statValueStyle: React.CSSProperties = {
  fontSize:   '22px',
  fontWeight: 700,
}

const statLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color:    '#666',
}

const sectionStyle: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  gap:           '12px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize:   '16px',
  fontWeight: 600,
  margin:     0,
  color:      '#ccc',
}

const tiersRowStyle: React.CSSProperties = {
  display: 'flex',
  gap:     '12px',
  flexWrap: 'wrap',
}

const tierBadgeStyle: React.CSSProperties = {
  flex:          1,
  minWidth:      '140px',
  background:    '#111',
  border:        '1px solid',
  borderRadius:  '10px',
  padding:       '14px 16px',
  display:       'flex',
  flexDirection: 'column',
  gap:           '4px',
}

const tierNumStyle: React.CSSProperties = {
  fontSize:   '14px',
  fontWeight: 700,
}

const tierCountStyle: React.CSSProperties = {
  fontSize: '13px',
  color:    '#888',
}

const historyListStyle: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  gap:           '10px',
}

const voteRowStyle: React.CSSProperties = {
  background:   '#111',
  border:       '1px solid #1e1e1e',
  borderRadius: '10px',
  padding:      '14px 16px',
}

const voteRowLeftStyle: React.CSSProperties = {
  display: 'flex',
  gap:     '12px',
}

const outcomeIconStyle: React.CSSProperties = {
  fontSize:  '20px',
  flexShrink: 0,
  marginTop: '1px',
}

const voteTitleStyle: React.CSSProperties = {
  fontSize:     '14px',
  fontWeight:   600,
  margin:       0,
  marginBottom: '4px',
}

const voteMetaStyle: React.CSSProperties = {
  fontSize: '12px',
  color:    '#888',
  margin:   0,
}
