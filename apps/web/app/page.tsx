import Link from 'next/link'

// ─── Static data (shown even before wallet connects) ──────────────────────────

const FLOW_STEPS = [
  {
    num:   '01',
    title: 'Drop or discover an idea',
    desc:  'Any founder can submit a startup idea. Scouts browse the live feed and vote YES or NO.',
    color: '#6366f1',
  },
  {
    num:   '02',
    title: 'Community votes in 69 hours',
    desc:  'Time-decay weights reward conviction: vote in the first 12h for a 3× multiplier. 69% YES threshold wins.',
    color: '#10b981',
  },
  {
    num:   '03',
    title: 'Token launches instantly',
    desc:  'The winning idea gets its own token on Base L2. Price rises with every buy on the bonding curve — no listing needed, trading starts immediately.',
    color: '#f59e0b',
  },
  {
    num:   '04',
    title: 'Early voters earn airdrops',
    desc:  'Scouts who voted YES on winning ideas receive vested token airdrops. The earlier you voted, the larger your share — T1 earns 3× more than T3.',
    color: '#f97316',
  },
]

const TRUST_ITEMS = [
  { tag: 'NO ADMIN KEY',   desc: 'Outcomes are set by the EigenCloud TEE — not by the pitchdrop team.' },
  { tag: 'VERIFIABLE',     desc: 'Every resolution is hashed on-chain as an eigenDaRef. Auditable forever.' },
  { tag: 'TRUSTLESS FUND', desc: 'Builder milestone releases require no human approval — agent only.' },
  { tag: 'OFAC SCREENED',  desc: 'Every wallet is screened via TRM Labs before any vote or claim.' },
]

const STATS = [
  { label: 'Voting window',    value: '69h' },
  { label: 'Win threshold',    value: '69%' },
  { label: 'Early multiplier', value: '3×'  },
  { label: 'Vesting period',   value: '90d' },
]

// ─── Page (server component — no 'use client') ────────────────────────────────

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f1f5f9' }}>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #141414',
        padding: '0 24px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 800, fontSize: '18px', color: '#6366f1' }}>pitchdrop</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link href="/feed"       style={navLinkStyle}>Feed</Link>
          <Link href="/leaderboard" style={navLinkStyle}>Leaderboard</Link>
          <Link href="/agent"      style={navLinkStyle}>Agent</Link>
          <Link href="/airdrop"    style={navLinkStyle}>Airdrop</Link>
          <Link href="/feed" style={{
            padding: '7px 18px', borderRadius: '8px',
            background: '#6366f1', color: '#fff',
            textDecoration: 'none', fontWeight: 600, fontSize: '13px',
          }}>
            Launch App →
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 100px' }}>

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <div style={{ paddingTop: '80px', paddingBottom: '72px', textAlign: 'center' }}>
          {/* Eyebrow */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <span style={pillStyle('#6366f1', 'rgba(99,102,241,0.12)')}>EIGENCLOUD TEE</span>
            <span style={pillStyle('#10b981', 'rgba(16,185,129,0.1)')}>BASE L2</span>
            <span style={pillStyle('#f59e0b', 'rgba(245,158,11,0.1)')}>CONVICTION MARKET</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 800,
            lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 20px',
          }}>
            Bet on ideas before<br />
            <span style={{ color: '#6366f1' }}>they&apos;re built.</span>
          </h1>

          <p style={{
            fontSize: '16px', color: '#64748b', lineHeight: 1.75,
            maxWidth: '560px', margin: '0 auto 36px',
          }}>
            pitchdrop is a trustless perception market on Base L2. Community scouts vote conviction
            on startup ideas. Winners get a token that launches instantly. A Sovereign Agent running
            in EigenCloud TEE resolves every outcome — no admin key, no company in the middle.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/feed" style={{
              padding: '12px 28px', borderRadius: '10px',
              background: '#6366f1', color: '#fff',
              textDecoration: 'none', fontWeight: 700, fontSize: '15px',
            }}>
              Explore Live Ideas →
            </Link>
            <Link href="/agent" style={{
              padding: '12px 28px', borderRadius: '10px',
              background: 'transparent', color: '#94a3b8',
              textDecoration: 'none', fontWeight: 600, fontSize: '15px',
              border: '1px solid #2a2a2a',
            }}>
              How the Agent works
            </Link>
          </div>
        </div>

        {/* ── Stats strip ────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1px', background: '#1a1a1a',
          border: '1px solid #1a1a1a', borderRadius: '14px', overflow: 'hidden',
          marginBottom: '64px',
        }}>
          {STATS.map(({ label, value }) => (
            <div key={label} style={{
              background: '#0d0d0d', padding: '24px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'monospace' }}>
                {value}
              </div>
              <div style={{ fontSize: '11px', color: '#374151', marginTop: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── How it works ───────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '64px' }}>
          <SectionLabel>How it works</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {FLOW_STEPS.map(({ num, title, desc, color }) => (
              <div key={num} style={{
                background: '#0d0d0d', border: '1px solid #1a1a1a',
                borderRadius: '14px', padding: '24px',
                borderTop: `3px solid ${color}`,
              }}>
                <div style={{
                  fontFamily: 'monospace', fontSize: '11px', fontWeight: 800,
                  color, letterSpacing: '0.06em', marginBottom: '12px',
                }}>
                  {num}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>
                  {title}
                </div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── EigenCloud trust section ────────────────────────────────────────── */}
        <div style={{ marginBottom: '64px' }}>
          <SectionLabel>EigenCloud guarantees</SectionLabel>
          <div style={{
            background: '#0d0d0d', border: '1px solid #1e1e1e',
            borderRadius: '14px', overflow: 'hidden',
          }}>
            {TRUST_ITEMS.map(({ tag, desc }, i) => (
              <div key={tag} style={{
                display: 'flex', alignItems: 'center', gap: '20px',
                padding: '16px 22px',
                borderBottom: i < TRUST_ITEMS.length - 1 ? '1px solid #141414' : 'none',
              }}>
                <span style={{
                  flexShrink: 0,
                  padding: '3px 10px', borderRadius: '4px',
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                  fontSize: '10px', fontWeight: 800, color: '#818cf8',
                  fontFamily: 'monospace', letterSpacing: '0.06em',
                  minWidth: '120px', textAlign: 'center',
                }}>
                  {tag}
                </span>
                <span style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Final CTA ──────────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)',
          border: '1px solid rgba(99,102,241,0.25)', borderRadius: '20px',
          padding: '48px 40px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: '#f1f5f9' }}>
            Vote early. Earn more.
          </div>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '28px', lineHeight: 1.7, maxWidth: '440px', margin: '0 auto 28px' }}>
            The crowd is voting on the next wave of crypto products right now.
            Every YES on a winning idea earns you a vested token airdrop.
          </p>
          <Link href="/feed" style={{
            display: 'inline-block',
            padding: '12px 32px', borderRadius: '10px',
            background: '#6366f1', color: '#fff',
            textDecoration: 'none', fontWeight: 700, fontSize: '15px',
          }}>
            See what&apos;s live →
          </Link>
        </div>

      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid #141414', padding: '24px',
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '32px',
        flexWrap: 'wrap',
      }}>
        {[
          { label: 'Feed',         href: '/feed' },
          { label: 'Leaderboard',  href: '/leaderboard' },
          { label: 'Airdrop',      href: '/airdrop' },
          { label: 'Sovereign Agent', href: '/agent' },
        ].map(({ label, href }) => (
          <Link key={href} href={href} style={{ fontSize: '13px', color: '#374151', textDecoration: 'none' }}>
            {label}
          </Link>
        ))}
        <span style={{ fontSize: '12px', color: '#1f1f1f', fontFamily: 'monospace' }}>
          Base Sepolia · EigenCloud TEE
        </span>
      </footer>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '11px', fontWeight: 700, color: '#374151',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      marginBottom: '16px',
    }}>
      {children}
    </div>
  )
}

function pillStyle(color: string, bg: string): React.CSSProperties {
  return {
    padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
    color, background: bg, border: `1px solid ${color}30`,
    fontFamily: 'monospace', letterSpacing: '0.04em',
  }
}

const navLinkStyle: React.CSSProperties = {
  fontSize: '13px', color: '#64748b', textDecoration: 'none', fontWeight: 500,
}
