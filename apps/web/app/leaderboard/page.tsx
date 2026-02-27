'use client'

import Link from 'next/link'
import { AuthButton } from '../components/AuthButton'
import { useLeaderboard } from '../hooks/useLeaderboard'
import type { LeaderboardEntry } from '../lib/api'

function shortenAddr(addr: string): string {
  if (addr.length < 14) return addr
  return addr.slice(0, 8) + '…' + addr.slice(-6)
}

function rankMedal(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return String(rank)
}

function fmtAccuracy(correctCalls: number, totalVotes: number): string {
  if (totalVotes === 0) return '—'
  return ((correctCalls / totalVotes) * 100).toFixed(1) + '%'
}

export default function LeaderboardPage() {
  const { data, isLoading, isError, error } = useLeaderboard()

  return (
    <div style={pageStyle}>
      {/* Nav */}
      <header style={navStyle}>
        <Link href="/feed" style={logoStyle}>pitchdrop</Link>
        <h1 style={navTitleStyle}>Scout Leaderboard</h1>
        <div style={navRightStyle}>
          <AuthButton />
        </div>
      </header>

      {/* Main */}
      <main style={mainStyle}>
        {isLoading && <p style={mutedStyle}>Loading leaderboard…</p>}
        {isError && (
          <p style={errorStyle}>{(error as Error).message}</p>
        )}

        {data && data.leaderboard.length === 0 && (
          <p style={mutedStyle}>No scouts on the leaderboard yet.</p>
        )}

        {data && data.leaderboard.length > 0 && (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Rank</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Scout</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle}>Votes</th>
                  <th style={thStyle}>Correct</th>
                  <th style={thStyle}>Accuracy</th>
                  <th style={thStyle}>Streak</th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.map((entry: LeaderboardEntry) => (
                  <tr key={entry.walletAddr} style={trStyle}>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: '16px' }}>
                      {rankMedal(entry.rank)}
                    </td>
                    <td style={tdStyle}>
                      <Link href={'/scout/' + entry.walletAddr} style={addrLinkStyle}>
                        {shortenAddr(entry.walletAddr)}
                      </Link>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={scoreBadgeStyle}>
                        {entry.score.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#aaa' }}>
                      {entry.totalVotes}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#aaa' }}>
                      {entry.correctCalls}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#aaa' }}>
                      {fmtAccuracy(entry.correctCalls, entry.totalVotes)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#aaa' }}>
                      {entry.streakDays > 0 ? `${entry.streakDays}d` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight:  '100vh',
  background: '#0a0a0a',
  color:      '#ededed',
}

const navStyle: React.CSSProperties = {
  display:      'flex',
  alignItems:   'center',
  gap:          '16px',
  padding:      '16px 24px',
  borderBottom: '1px solid #1a1a1a',
  position:     'sticky',
  top:          0,
  background:   '#0a0a0a',
  zIndex:       10,
  flexWrap:     'wrap',
}

const logoStyle: React.CSSProperties = {
  fontSize:       '18px',
  fontWeight:     700,
  color:          '#ededed',
  textDecoration: 'none',
  marginRight:    '8px',
  whiteSpace:     'nowrap',
}

const navTitleStyle: React.CSSProperties = {
  fontSize:   '16px',
  fontWeight: 600,
  margin:     0,
  flex:       1,
  color:      '#ededed',
}

const navRightStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        '12px',
}

const mainStyle: React.CSSProperties = {
  maxWidth: '860px',
  margin:   '0 auto',
  padding:  '32px 24px',
}

const mutedStyle: React.CSSProperties = {
  color:    '#666',
  fontSize: '14px',
}

const errorStyle: React.CSSProperties = {
  color:    '#ef4444',
  fontSize: '14px',
}

const tableWrapStyle: React.CSSProperties = {
  background:   '#111',
  borderRadius: '12px',
  border:       '1px solid #1e1e1e',
  overflow:     'hidden',
}

const tableStyle: React.CSSProperties = {
  width:           '100%',
  borderCollapse:  'collapse',
}

const thStyle: React.CSSProperties = {
  padding:      '12px 16px',
  fontSize:     '11px',
  fontWeight:   600,
  color:        '#555',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  textAlign:    'center',
  borderBottom: '1px solid #1e1e1e',
  background:   '#0f0f0f',
}

const trStyle: React.CSSProperties = {
  borderBottom: '1px solid #1a1a1a',
}

const tdStyle: React.CSSProperties = {
  padding:  '14px 16px',
  fontSize: '14px',
}

const addrLinkStyle: React.CSSProperties = {
  color:          '#6366f1',
  textDecoration: 'none',
  fontFamily:     'monospace',
  fontSize:       '13px',
}

const scoreBadgeStyle: React.CSSProperties = {
  display:      'inline-block',
  background:   '#1a1a2e',
  color:        '#6366f1',
  border:       '1px solid #6366f1',
  borderRadius: '6px',
  padding:      '2px 8px',
  fontSize:     '12px',
  fontWeight:   700,
}
