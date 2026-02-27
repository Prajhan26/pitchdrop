'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../hooks/useAuth'
import { AuthButton } from '../../../components/AuthButton'
import { useSubmitMilestone } from '../../../hooks/useMilestones'

export default function MilestonesPage() {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated, walletAddress } = useAuth()

  const [milestoneId, setMilestoneId] = useState<number>(0)
  const [evidence, setEvidence] = useState('')

  const submitMilestone = useSubmitMilestone()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!walletAddress) return
    submitMilestone.mutate({
      ideaId:      id,
      milestoneId,
      evidence,
      submitter:   walletAddress,
    })
  }

  return (
    <div style={pageStyle}>
      {/* Sticky Nav */}
      <header style={navStyle}>
        <Link href="/feed" style={logoStyle}>
          pitchdrop
        </Link>
        <Link href={`/ideas/${id}`} style={backLinkStyle}>
          ← Back
        </Link>
        <span style={pageTitleStyle}>Milestone Submission</span>
        <div style={{ marginLeft: 'auto' }}>
          <AuthButton />
        </div>
      </header>

      <main style={mainStyle}>
        <section style={introSectionStyle}>
          <h1 style={headingStyle}>Submit Milestone Evidence</h1>
          <p style={introTextStyle}>
            Submit evidence that a milestone has been met. The Sovereign Agent will evaluate your
            submission.
          </p>
        </section>

        {!isAuthenticated ? (
          <div style={unauthCardStyle}>
            <p style={unauthTextStyle}>Sign in to submit milestone evidence</p>
          </div>
        ) : submitMilestone.isSuccess ? (
          <div style={successCardStyle}>
            <p style={successTextStyle}>
              Submission received. The agent will evaluate it shortly.
            </p>
            <p style={successSubStyle}>
              Idea: <span style={{ fontFamily: 'monospace' }}>{id}</span> — Milestone #{milestoneId}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={formStyle}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle} htmlFor="milestone-id">
                Milestone #
              </label>
              <input
                id="milestone-id"
                type="number"
                min={0}
                value={milestoneId}
                onChange={(e) => setMilestoneId(Number(e.target.value))}
                style={inputStyle}
                required
              />
              <span style={hintStyle}>Zero-based index (0 = first milestone)</span>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle} htmlFor="evidence">
                Evidence URL or Description
              </label>
              <textarea
                id="evidence"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="https://… or describe the evidence in at least 20 characters"
                rows={5}
                minLength={20}
                style={textareaStyle}
                required
              />
              <span style={hintStyle}>Minimum 20 characters. Can be a URL or a description.</span>
            </div>

            {submitMilestone.isError && (
              <p style={errorStyle}>
                {(submitMilestone.error as Error).message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitMilestone.isPending || evidence.length < 20}
              style={{
                ...submitButtonStyle,
                opacity: submitMilestone.isPending || evidence.length < 20 ? 0.5 : 1,
                cursor: submitMilestone.isPending || evidence.length < 20 ? 'not-allowed' : 'pointer',
              }}
            >
              {submitMilestone.isPending ? 'Submitting…' : 'Submit Evidence'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
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

const pageTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#aaa',
  fontWeight: 500,
}

const mainStyle: React.CSSProperties = {
  maxWidth: '640px',
  margin: '0 auto',
  padding: '40px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '28px',
}

const introSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

const headingStyle: React.CSSProperties = {
  fontSize: '26px',
  fontWeight: 800,
  margin: 0,
  color: '#ededed',
}

const introTextStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#888',
  lineHeight: 1.6,
  margin: 0,
}

const unauthCardStyle: React.CSSProperties = {
  background: '#111',
  border: '1px solid #1a1a1a',
  borderRadius: '12px',
  padding: '32px 24px',
  textAlign: 'center',
}

const unauthTextStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#888',
  margin: 0,
}

const successCardStyle: React.CSSProperties = {
  background: 'rgba(16, 185, 129, 0.08)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  borderRadius: '12px',
  padding: '28px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const successTextStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#10b981',
  margin: 0,
}

const successSubStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#666',
  margin: 0,
}

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  background: '#111',
  border: '1px solid #1a1a1a',
  borderRadius: '12px',
  padding: '28px 24px',
}

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#ccc',
  letterSpacing: '0.02em',
}

const inputStyle: React.CSSProperties = {
  background: '#0a0a0a',
  border: '1px solid #2a2a2a',
  borderRadius: '8px',
  color: '#ededed',
  fontSize: '15px',
  padding: '10px 14px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const textareaStyle: React.CSSProperties = {
  background: '#0a0a0a',
  border: '1px solid #2a2a2a',
  borderRadius: '8px',
  color: '#ededed',
  fontSize: '15px',
  padding: '10px 14px',
  outline: 'none',
  resize: 'vertical',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  lineHeight: 1.55,
}

const hintStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#555',
}

const errorStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#ef4444',
  margin: 0,
}

const submitButtonStyle: React.CSSProperties = {
  padding: '14px 24px',
  borderRadius: '10px',
  border: 'none',
  background: '#6366f1',
  color: '#fff',
  fontWeight: 700,
  fontSize: '15px',
  letterSpacing: '0.02em',
  transition: 'opacity 0.15s',
  alignSelf: 'flex-start',
}
