'use client'

import { useState } from 'react'
import { useIdeas } from '../hooks/useIdeas'
import { IdeaCard } from '../components/IdeaCard'
import { AuthButton } from '../components/AuthButton'
import Link from 'next/link'

type StatusFilter = 'active' | 'won' | 'graveyard' | 'all'

export default function FeedPage() {
  const [filter, setFilter] = useState<StatusFilter>('active')
  const { data, isLoading, isError, error } = useIdeas(filter)

  return (
    <div style={pageStyle}>
      {/* Nav */}
      <header style={navStyle}>
        <Link href="/" style={logoStyle}>pitchdrop</Link>
        <nav style={tabsStyle}>
          {(['active', 'won', 'graveyard'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                ...tabStyle,
                ...(filter === s ? activeTabStyle : {}),
              }}
            >
              {s === 'active'    ? '🔥 Live'       : ''}
              {s === 'won'       ? '✅ Won'         : ''}
              {s === 'graveyard' ? '⚰️ Graveyard'  : ''}
            </button>
          ))}
        </nav>
        <AuthButton />
      </header>

      {/* Main */}
      <main style={mainStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>
            {filter === 'active'    ? 'Live Ideas'    : ''}
            {filter === 'won'       ? 'Won Ideas'     : ''}
            {filter === 'graveyard' ? 'Graveyard'     : ''}
          </h1>
          {data && (
            <span style={countStyle}>{data.total} idea{data.total !== 1 ? 's' : ''}</span>
          )}
        </div>

        {isLoading && <p style={mutedStyle}>Loading ideas…</p>}
        {isError   && <p style={errorStyle}>{(error as Error).message}</p>}

        {data && data.ideas.length === 0 && (
          <div style={emptyStyle}>
            <p style={emptyTitleStyle}>No ideas yet</p>
            <p style={mutedStyle}>Be the first to drop a pitch.</p>
          </div>
        )}

        <div style={gridStyle}>
          {data?.ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
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
  display:        'flex',
  alignItems:     'center',
  gap:            '16px',
  padding:        '16px 24px',
  borderBottom:   '1px solid #1a1a1a',
  position:       'sticky',
  top:            0,
  background:     '#0a0a0a',
  zIndex:         10,
  flexWrap:       'wrap',
}

const logoStyle: React.CSSProperties = {
  fontSize:       '18px',
  fontWeight:     700,
  color:          '#ededed',
  textDecoration: 'none',
  marginRight:    '8px',
}

const tabsStyle: React.CSSProperties = {
  display: 'flex',
  gap:     '4px',
  flex:    1,
}

const tabStyle: React.CSSProperties = {
  padding:      '6px 14px',
  borderRadius: '8px',
  border:       '1px solid #222',
  background:   'transparent',
  color:        '#888',
  cursor:       'pointer',
  fontSize:     '13px',
  fontWeight:   500,
}

const activeTabStyle: React.CSSProperties = {
  background: '#1a1a1a',
  color:      '#ededed',
  border:     '1px solid #333',
}

const mainStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin:   '0 auto',
  padding:  '32px 24px',
}

const headerStyle: React.CSSProperties = {
  display:        'flex',
  alignItems:     'baseline',
  gap:            '12px',
  marginBottom:   '24px',
}

const titleStyle: React.CSSProperties = {
  fontSize:   '22px',
  fontWeight: 700,
  margin:     0,
}

const countStyle: React.CSSProperties = {
  fontSize: '14px',
  color:    '#666',
}

const mutedStyle: React.CSSProperties = {
  color:    '#666',
  fontSize: '14px',
}

const errorStyle: React.CSSProperties = {
  color:    '#ef4444',
  fontSize: '14px',
}

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding:   '60px 0',
}

const emptyTitleStyle: React.CSSProperties = {
  fontSize:     '18px',
  fontWeight:   600,
  marginBottom: '8px',
}

const gridStyle: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  gap:           '16px',
}
