import Link from 'next/link'
import { AuthButton } from './components/AuthButton'

export default function Home() {
  return (
    <main style={mainStyle}>
      <h1 style={headingStyle}>pitchdrop</h1>
      <p style={subStyle}>The world&apos;s first perception market</p>
      <p style={descStyle}>
        Bet on startup ideas before they&apos;re built.
        <br />
        Be right early — earn a stake in what gets built next.
      </p>
      <div style={ctaRowStyle}>
        <Link href="/feed" style={primaryButtonStyle}>
          View Live Ideas
        </Link>
        <AuthButton />
      </div>
    </main>
  )
}

const mainStyle: React.CSSProperties = {
  minHeight:      '100vh',
  display:        'flex',
  flexDirection:  'column',
  alignItems:     'center',
  justifyContent: 'center',
  gap:            '16px',
  padding:        '24px',
  textAlign:      'center',
}

const headingStyle: React.CSSProperties = {
  fontSize:   '3rem',
  fontWeight: 800,
  margin:     0,
}

const subStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  opacity:  0.5,
  margin:   0,
}

const descStyle: React.CSSProperties = {
  fontSize:   '1rem',
  lineHeight: 1.7,
  opacity:    0.7,
  maxWidth:   '420px',
  margin:     0,
}

const ctaRowStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        '12px',
  marginTop:  '8px',
  flexWrap:   'wrap',
  justifyContent: 'center',
}

const primaryButtonStyle: React.CSSProperties = {
  padding:        '10px 24px',
  borderRadius:   '8px',
  background:     '#6366f1',
  color:          '#fff',
  textDecoration: 'none',
  fontWeight:     600,
  fontSize:       '15px',
}
