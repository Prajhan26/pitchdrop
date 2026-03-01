'use client'

import Link from 'next/link'
import { AuthButton } from '../components/AuthButton'

const AGENT_CONTRACT = '0x83cE5Ff475742ff7B7DDe581c01369e4BA270Ad9'
const BASESCAN_URL   = `https://sepolia.basescan.org/address/${AGENT_CONTRACT}`

const GUARANTEES = [
  {
    tag:   'NO ADMIN KEY',
    color: '#6366f1',
    bg:    'rgba(99,102,241,0.08)',
    title: 'Zero override capability',
    desc:  'Once a vote closes, no wallet — not even the deployer — can change the outcome. The TEE is the only authority.',
  },
  {
    tag:   'VERIFIABLE',
    color: '#10b981',
    bg:    'rgba(16,185,129,0.08)',
    title: 'Every decision is provable',
    desc:  'Each resolution is hashed and stored as an eigenDaRef on-chain. Anyone can verify what data the agent used.',
  },
  {
    tag:   'DATA AVAIL',
    color: '#f59e0b',
    bg:    'rgba(245,158,11,0.08)',
    title: 'EigenDA availability',
    desc:  'Full attestation blobs (reasoning, scores, inputs) are committed to EigenDA — not a centralized server.',
  },
  {
    tag:   'TRUSTLESS',
    color: '#f97316',
    bg:    'rgba(249,115,22,0.08)',
    title: 'Milestone funds release automatically',
    desc:  'Builder submits evidence → agent evaluates inside TEE → BuildFund releases. No human approval step.',
  },
]

const MODULES = [
  {
    id:      '01',
    name:    'BullBear Evaluator',
    status:  'built',
    accent:  '#6366f1',
    bg:      'rgba(99,102,241,0.05)',
    icon:    '📊',
    tagline: 'AI conviction scoring',
    what:    'Generates a PMF conviction score (0–100) for every active idea using Claude AI.',
    how:     'Runs Claude claude-sonnet-4-6 inside the TEE. Vote weights + idea text → bull case + bear case + score. The score on won idea cards is produced here.',
    note:    'Code complete · TEE deployment is the production step',
  },
  {
    id:      '02',
    name:    'Attestation Worker',
    status:  'built',
    accent:  '#10b981',
    bg:      'rgba(16,185,129,0.05)',
    icon:    '🔏',
    tagline: 'On-chain data availability',
    what:    'Commits every resolved idea result to EigenDA and posts the reference on-chain.',
    how:     'keccak256(ideaId + voteWeights + timestamp + pmfScore) → EigenDA blob → SovereignAgent.postAttestation(eigenDaRef). Contract deployed and ready.',
    note:    'Hash logic complete · contract deployed · EigenDA posting is the production step',
  },
  {
    id:      '03',
    name:    'Milestone Evaluator',
    status:  'built',
    accent:  '#f59e0b',
    bg:      'rgba(245,158,11,0.05)',
    icon:    '🏗️',
    tagline: 'Trustless fund release',
    what:    'Evaluates builder milestone evidence and triggers BuildFund release. No multisig, no human.',
    how:     'Builder submits proof → Claude AI inside TEE reviews it → confidence score → if approved, calls BuildFund.release(tranche). Powered by EigenCloud.',
    note:    'Evaluation logic complete · BuildFund.sol deployed · live trigger is the production step',
  },
  {
    id:      '04',
    name:    'OFAC Screener',
    status:  'live',
    accent:  '#10b981',
    bg:      'rgba(16,185,129,0.08)',
    icon:    '🛡️',
    tagline: 'Compliance — live now',
    what:    'Screens every wallet against OFAC sanctions before any vote or airdrop claim.',
    how:     'TRM Labs API call on every interaction. Sanctioned addresses are rejected at the indexer API layer before any on-chain transaction.',
    note:    'Live on Railway indexer right now',
  },
]

const FLOW = [
  { label: 'Idea submitted on-chain',          sub: 'IdeaRegistry.sol on Base'              },
  { label: '69-hour community vote',           sub: 'time-decay weights: 3× / 2× / 1×'     },
  { label: 'TEE reads final vote state',       sub: 'SovereignAgent polls VotingEngine'     },
  { label: 'Claude scores the PMF quality',   sub: 'bull/bear + 0–100 score inside TEE'    },
  { label: 'Result hashed → EigenDA blob',    sub: 'data availability commitment'          },
  { label: 'eigenDaRef written on-chain',      sub: 'SovereignAgent.postAttestation()'      },
  { label: 'Token launches for trading',       sub: 'BondingCurve activated on Base'        },
  { label: 'Builder milestones → fund release',sub: 'agent verifies → BuildFund releases'  },
]

const CONTRACTS = [
  { name: 'SovereignAgent',      addr: '0x83cE5Ff475742ff7B7DDe581c01369e4BA270Ad9' },
  { name: 'IdeaRegistry',        addr: '0x2ff1280134678EDf046244160cd1DdF5369E1Be3' },
  { name: 'BondingCurveFactory', addr: '0x29D11C4AB7dCa6f513BE84A644634911dF233E6b' },
  { name: 'AirdropDistributor',  addr: '0x736dFE720001BD6D50Def269250f47a6c26C89eB' },
  { name: 'BuildFund',           addr: '0x22aefD31f9B51036d971a8D8e1094547d118B087' },
]

export default function AgentPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f1f5f9' }}>

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
          <Link href="/feed" style={{ textDecoration: 'none', fontSize: '13px', color: '#475569' }}>← Feed</Link>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Sovereign Agent</span>
        </div>
        <AuthButton />
      </nav>

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
              background: 'rgba(99,102,241,0.12)', color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.25)', fontFamily: 'monospace', letterSpacing: '0.04em',
            }}>
              EIGENCLOUD TEE
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
              background: 'rgba(16,185,129,0.1)', color: '#34d399',
              border: '1px solid rgba(16,185,129,0.2)', fontFamily: 'monospace', letterSpacing: '0.04em',
            }}>
              CONTRACT LIVE
            </span>
          </div>
          <h1 style={{ margin: '0 0 12px', fontSize: '28px', fontWeight: 700 }}>
            pitchdrop Sovereign Agent
          </h1>
          <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b', lineHeight: 1.7, maxWidth: '620px' }}>
            Every outcome on pitchdrop — who wins a vote, whether a builder milestone was
            completed, which wallets are allowed — is decided by this agent running inside an
            EigenCloud Trusted Execution Environment. The hardware guarantees nobody can alter the result.
          </p>
          <a
            href={BASESCAN_URL}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '8px',
              background: '#111', border: '1px solid #2a2a2a',
              color: '#94a3b8', fontSize: '12px', fontWeight: 600,
              textDecoration: 'none', fontFamily: 'monospace',
            }}
          >
            SovereignAgent.sol · {AGENT_CONTRACT.slice(0, 10)}…{AGENT_CONTRACT.slice(-8)} ↗
          </a>
        </div>

        {/* ── What EigenCloud guarantees ────────────────────────────────────── */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
            What EigenCloud guarantees
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {GUARANTEES.map(({ tag, color, bg, title, desc }) => (
              <div key={tag} style={{
                background: bg, border: `1px solid ${color}30`,
                borderRadius: '12px', padding: '16px',
              }}>
                <div style={{
                  display: 'inline-block', marginBottom: '8px',
                  padding: '2px 8px', borderRadius: '4px',
                  background: `${color}20`, border: `1px solid ${color}40`,
                  fontSize: '10px', fontWeight: 800, color, fontFamily: 'monospace', letterSpacing: '0.06em',
                }}>
                  {tag}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>{title}</div>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Agent modules ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Agent modules
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {MODULES.map(({ id, name, status, accent, bg, icon, tagline, what, how, note }) => (
              <div key={id} style={{
                background: bg, border: `1px solid ${accent}25`,
                borderRadius: '14px', padding: '20px',
                display: 'flex', flexDirection: 'column', gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                      background: `${accent}18`, border: `1px solid ${accent}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                    }}>
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>{name}</div>
                      <div style={{ fontSize: '11px', color: accent, fontWeight: 600, marginTop: '1px' }}>{tagline}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 800, color: '#374151' }}>{id}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px',
                      fontSize: '9px', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.06em',
                      background: status === 'live' ? 'rgba(16,185,129,0.15)' : `${accent}15`,
                      color:      status === 'live' ? '#34d399' : accent,
                      border:     `1px solid ${status === 'live' ? 'rgba(16,185,129,0.3)' : accent + '30'}`,
                    }}>
                      {status === 'live' ? '● LIVE' : 'BUILT'}
                    </span>
                  </div>
                </div>
                <div style={{ height: '1px', background: `${accent}15` }} />
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>{what}</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#475569', lineHeight: 1.55 }}>{how}</p>
                <div style={{
                  padding: '4px 10px', borderRadius: '4px', alignSelf: 'flex-start',
                  background: '#0a0a0a', border: `1px solid ${accent}15`,
                  fontSize: '10px', color: '#374151', fontFamily: 'monospace',
                }}>
                  {note}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── End-to-end flow ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
            End-to-end flow
          </div>
          <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '20px' }}>
            {FLOW.map(({ label, sub }, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px',
                paddingBottom: i < FLOW.length - 1 ? '16px' : '0',
                borderBottom: i < FLOW.length - 1 ? '1px solid #111' : 'none',
                marginBottom: i < FLOW.length - 1 ? '16px' : '0',
              }}>
                <div style={{
                  minWidth: '24px', height: '24px', borderRadius: '50%',
                  background: i < 7 ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.1)',
                  border: `1px solid ${i < 7 ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700,
                  color: i < 7 ? '#818cf8' : '#f59e0b',
                  fontFamily: 'monospace',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '11px', color: '#374151', fontFamily: 'monospace' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Contracts ─────────────────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Contracts — Base Sepolia
          </div>
          <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '12px', overflow: 'hidden' }}>
            {CONTRACTS.map(({ name, addr }, i) => (
              <div key={name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 18px',
                borderBottom: i < CONTRACTS.length - 1 ? '1px solid #111' : 'none',
              }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>{name}</span>
                <a
                  href={`https://sepolia.basescan.org/address/${addr}`}
                  target="_blank" rel="noopener noreferrer"
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
