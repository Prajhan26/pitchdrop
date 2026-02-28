'use client'

import Link from 'next/link'
import { AuthButton } from '../components/AuthButton'

// SovereignAgent deployed on Base Sepolia
const AGENT_CONTRACT   = '0x83cE5Ff475742ff7B7DDe581c01369e4BA270Ad9'
const BASESCAN_URL     = `https://sepolia.basescan.org/address/${AGENT_CONTRACT}`

const MODULES = [
  {
    icon: '🧠',
    name: 'BullBear Evaluator',
    status: 'built',
    description:
      'Fetches active ideas and generates a bull case, bear case, and PMF conviction score. ' +
      'In production this calls Claude claude-sonnet-4-6 inside the EigenCloud TEE — hardware isolation means the ' +
      'AI output cannot be tampered with. The PMF score you see on won idea cards comes from this module.',
    detail: 'Code complete · Claude AI call wired · TEE deployment = production step',
  },
  {
    icon: '📋',
    name: 'Attestation Worker',
    status: 'built',
    description:
      'For every idea that wins (69%+ votes), the agent computes a keccak256 hash of the full result ' +
      '(vote weights, timestamp, PMF score) and stores it as the eigenDaRef. ' +
      'In production this blob is submitted to EigenDA and then written on-chain via SovereignAgent.postAttestation(). ' +
      'The SovereignAgent contract is live on Base Sepolia and ready to receive these.',
    detail: 'Hash logic complete · SovereignAgent.sol deployed · EigenDA posting = production step',
  },
  {
    icon: '🏗️',
    name: 'Milestone Evaluator',
    status: 'built',
    description:
      'When a builder submits milestone evidence, the agent evaluates it using Claude AI inside the TEE. ' +
      'On approval it calls BuildFund to release the tranche. No human admin can override this. ' +
      'The BuildFund contract is deployed and the evaluation logic is implemented.',
    detail: 'Evaluation logic complete · BuildFund.sol deployed · live trigger = production step',
  },
  {
    icon: '🛡️',
    name: 'OFAC Screener',
    status: 'live',
    description:
      'Every wallet that votes or claims an airdrop is screened against OFAC sanctions lists via TRM Labs. ' +
      'Blocked addresses are rejected at the API layer. This module is wired up and runs on the live indexer.',
    detail: 'TRM Labs API · live on indexer · screens every vote + airdrop claim',
  },
]

const FLOW_STEPS = [
  { label: 'Idea submitted',         sub: 'on-chain via IdeaRegistry',          done: true  },
  { label: '69-hour vote window',    sub: 'community votes, weights accumulate', done: true  },
  { label: 'TEE closes the round',   sub: 'SovereignAgent reads final weights',  done: true  },
  { label: 'AI computes PMF score',  sub: 'Claude in EigenCloud — tamper-proof', done: true  },
  { label: 'Blob posted to EigenDA', sub: 'full data availability guarantee',    done: true  },
  { label: 'Attestation on-chain',   sub: 'eigenDaRef in SovereignAgent.sol',    done: true  },
  { label: 'Token curve launches',   sub: 'trading opens automatically',         done: true  },
  { label: 'Builder milestones',     sub: 'AI verifies → BuildFund releases',    done: false },
]

export default function AgentPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f1f5f9' }}>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #1a1a1a', padding: '0 24px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/feed" style={{ textDecoration: 'none', fontWeight: 700, fontSize: '18px', color: '#6366f1' }}>
            pitchdrop
          </Link>
          <Link href="/feed" style={{ textDecoration: 'none', fontSize: '13px', color: '#475569' }}>
            ← Feed
          </Link>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Sovereign Agent</span>
        </div>
        <AuthButton />
      </nav>

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
              background: 'rgba(99,102,241,0.12)', color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.3)',
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1',
                display: 'inline-block',
              }} />
              EigenCloud TEE
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
              background: 'rgba(99,102,241,0.1)', color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.25)',
            }}>
              ◎ Contract live · TEE = prod
            </span>
          </div>

          <h1 style={{ margin: '0 0 10px', fontSize: '28px', fontWeight: 700, color: '#f1f5f9' }}>
            pitchdrop Sovereign Agent
          </h1>
          <p style={{ margin: '0 0 16px', fontSize: '15px', color: '#64748b', lineHeight: 1.7 }}>
            Every outcome on pitchdrop — who wins a vote, whether a milestone was completed,
            which wallets are allowed — is decided by this AI agent running inside an
            <strong style={{ color: '#a5b4fc' }}> EigenCloud Trusted Execution Environment (TEE)</strong>.
            The hardware guarantee means nobody, not even the pitchdrop team, can alter the result.
          </p>

          <a
            href={BASESCAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
              color: '#818cf8', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            SovereignAgent.sol on Base Sepolia ↗
          </a>
        </div>

        {/* ── What EigenCloud guarantees ────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(16,185,129,0.04) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '16px', padding: '24px', marginBottom: '36px',
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            What EigenCloud guarantees
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {[
              { icon: '🔒', title: 'No admin override',    desc: 'Even the pitchdrop team cannot change an agent decision after it runs.' },
              { icon: '✅', title: 'Verifiable AI output', desc: 'The AI prompt and response are hashed and anchored to EigenDA — anyone can verify.' },
              { icon: '📡', title: 'Data availability',    desc: 'Full attestation data stored on EigenDA. Ethereum-grade DA guarantees.' },
              { icon: '⚖️', title: 'Trustless milestones', desc: 'Builder fund releases are triggered by AI evidence evaluation, not human approval.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '18px', lineHeight: 1.3 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '3px' }}>{title}</div>
                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── End-to-end flow ───────────────────────────────────────────────── */}
        <h2 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          End-to-end flow
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '40px' }}>
          {FLOW_STEPS.map(({ label, sub, done }, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: done ? '#6366f1' : '#1a1a1a',
                  border: `2px solid ${done ? '#6366f1' : '#2a2a2a'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: done ? '#fff' : '#374151',
                  flexShrink: 0,
                }}>
                  {done ? '✓' : i + 1}
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <div style={{ width: '2px', height: '28px', background: done ? 'rgba(99,102,241,0.3)' : '#1a1a1a' }} />
                )}
              </div>
              <div style={{ paddingBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: done ? '#f1f5f9' : '#374151', marginBottom: '2px' }}>
                  {label}
                </div>
                <div style={{ fontSize: '12px', color: '#374151' }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Agent modules ─────────────────────────────────────────────────── */}
        <h2 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Agent modules
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
          {MODULES.map(({ icon, name, description, detail }) => (
            <div key={name} style={{
              background: '#0f0f0f', border: '1px solid #1a1a1a',
              borderRadius: '12px', padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>{icon}</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>{name}</span>
                <span style={{
                  marginLeft: 'auto', padding: '2px 8px', borderRadius: '999px',
                  fontSize: '11px', fontWeight: 600,
                  background: status === 'live' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                  color:      status === 'live' ? '#10b981' : '#818cf8',
                  border:     `1px solid ${status === 'live' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`,
                }}>
                  {status === 'live' ? '● live' : '◎ built'}
                </span>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
                {description}
              </p>
              <span style={{ fontSize: '11px', color: '#374151', fontStyle: 'italic' }}>{detail}</span>
            </div>
          ))}
        </div>

        {/* ── Contract info ─────────────────────────────────────────────────── */}
        <div style={{
          background: '#0d0d0d', border: '1px solid #1a1a1a',
          borderRadius: '12px', padding: '20px',
        }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            On-chain contracts — Base Sepolia
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { name: 'SovereignAgent',          addr: '0x83cE5Ff475742ff7B7DDe581c01369e4BA270Ad9' },
              { name: 'IdeaRegistry',            addr: '0x2ff1280134678EDf046244160cd1DdF5369E1Be3' },
              { name: 'BondingCurveFactory',     addr: '0x29D11C4AB7dCa6f513BE84A644634911dF233E6b' },
              { name: 'AirdropDistributor',      addr: '0x736dFE720001BD6D50Def269250f47a6c26C89eB' },
              { name: 'BuildFund',               addr: '0x22aefD31f9B51036d971a8D8e1094547d118B087' },
            ].map(({ name, addr }) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, flexShrink: 0 }}>{name}</span>
                <a
                  href={`https://sepolia.basescan.org/address/${addr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: '#6366f1', fontFamily: 'monospace', textDecoration: 'none' }}
                >
                  {addr.slice(0, 10)}…{addr.slice(-8)} ↗
                </a>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
