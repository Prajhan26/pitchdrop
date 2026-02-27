'use client'

import { useAuth } from '../hooks/useAuth'

export function AuthButton() {
  const { ready, isAuthenticated, walletAddress, login, logout } = useAuth()

  if (!ready) {
    return (
      <button disabled style={buttonStyle}>
        Loading…
      </button>
    )
  }

  if (isAuthenticated) {
    const short = walletAddress
      ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
      : 'connected'

    return (
      <div style={rowStyle}>
        <span style={addressStyle}>{short}</span>
        <button onClick={logout} style={buttonStyle}>
          Sign out
        </button>
      </div>
    )
  }

  return (
    <button onClick={login} style={{ ...buttonStyle, ...primaryStyle }}>
      Sign in
    </button>
  )
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid #333',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: '14px',
}

const primaryStyle: React.CSSProperties = {
  background: '#6366f1',
  color: '#fff',
  border: 'none',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}

const addressStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '13px',
  opacity: 0.7,
}
