'use client'

import { useAuth } from '../hooks/useAuth'

export function AuthButton() {
  const { ready, isAuthenticated, walletAddress, login, logout } = useAuth()

  if (isAuthenticated) {
    const short = walletAddress
      ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
      : 'connected'
    return (
      <div style={rowStyle}>
        <span style={addressStyle}>{short}</span>
        <button onClick={logout} style={buttonStyle}>Sign out</button>
      </div>
    )
  }

  // Show the sign-in button immediately — works once Privy is ready (instant or ~1s)
  return (
    <button
      onClick={ready ? login : undefined}
      style={{ ...buttonStyle, ...primaryStyle, opacity: ready ? 1 : 0.7 }}
    >
      {ready ? 'Connect wallet' : 'Connect wallet'}
    </button>
  )
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
  transition: 'opacity 0.2s',
}

const primaryStyle: React.CSSProperties = {
  background: '#6366f1',
  color: '#fff',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
}

const addressStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#94a3b8',
}
