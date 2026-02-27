'use client'

import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { IdeaSubmissionSchema } from '@pitchdrop/shared'
import { useAuth } from '../hooks/useAuth'
import { useRegisterIdea } from '../hooks/useContracts'
import { api } from '../lib/api'

interface SubmitIdeaModalProps {
  onClose: () => void
}

type FormState = {
  title:       string
  description: string
  category:    string
  isAnonymous: boolean
}

type Phase = 'form' | 'submitting' | 'success' | 'error'

export function SubmitIdeaModal({ onClose }: SubmitIdeaModalProps) {
  const { walletAddress, isAuthenticated, login } = useAuth()
  const { registerIdea, isAvailable: hasContract } = useRegisterIdea()
  const queryClient = useQueryClient()

  const [form, setForm]         = useState<FormState>({ title: '', description: '', category: '', isAnonymous: false })
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [phase, setPhase]       = useState<Phase>('form')
  const [statusMsg, setStatusMsg] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function update(field: keyof FormState, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isAuthenticated) { login(); return }

    // Client-side validation
    const result = IdeaSubmissionSchema.safeParse(form)
    if (!result.success) {
      const errs: typeof fieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormState
        if (field) errs[field] = issue.message
      }
      setFieldErrors(errs)
      return
    }

    setPhase('submitting')

    try {
      let onchainId: string | undefined

      // Step 1 (optional): register on-chain if contract is deployed
      if (hasContract) {
        setStatusMsg('Confirm in your wallet…')
        onchainId = await registerIdea(form.title)
        setStatusMsg('Waiting for confirmation…')
      }

      // Step 2: persist to indexer
      setStatusMsg('Saving to indexer…')
      await api.createIdea({
        title:       form.title,
        description: form.description,
        category:    form.category,
        isAnonymous: form.isAnonymous,
        founderAddr: form.isAnonymous ? undefined : walletAddress ?? undefined,
        onchainId,
      })

      // Refresh the feed
      queryClient.invalidateQueries({ queryKey: ['ideas'] })
      setPhase('success')
    } catch (err) {
      setStatusMsg((err as Error).message ?? 'Something went wrong')
      setPhase('error')
    }
  }

  const charTitle = form.title.length
  const charDesc  = form.description.length

  return (
    <div ref={overlayRef} style={overlayStyle} onClick={(e) => { if (e.target === overlayRef.current) onClose() }}>
      <div style={modalStyle} role="dialog" aria-modal="true" aria-label="Drop a Pitch">

        {/* Header */}
        <div style={headerStyle}>
          <h2 style={modalTitleStyle}>Drop a Pitch</h2>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Close">✕</button>
        </div>

        {/* Success */}
        {phase === 'success' && (
          <div style={successStyle}>
            <p style={successEmojiStyle}>🚀</p>
            <p style={successTextStyle}>Your pitch is live!</p>
            <p style={mutedStyle}>Voting is open for 69 hours.</p>
            <button onClick={onClose} style={primaryButtonStyle}>View Feed</button>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div style={errorBlockStyle}>
            <p style={errorTextStyle}>❌ {statusMsg}</p>
            <button onClick={() => setPhase('form')} style={secondaryButtonStyle}>Try again</button>
          </div>
        )}

        {/* Submitting */}
        {phase === 'submitting' && (
          <div style={submittingStyle}>
            <p style={spinnerStyle}>⏳</p>
            <p style={mutedStyle}>{statusMsg}</p>
          </div>
        )}

        {/* Form */}
        {phase === 'form' && (
          <form onSubmit={handleSubmit} style={formStyle}>
            {/* Title */}
            <div style={fieldStyle}>
              <div style={labelRowStyle}>
                <label style={labelStyle}>Title</label>
                <span style={charCountStyle}>{charTitle}/120</span>
              </div>
              <input
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="One crisp sentence. What is the idea?"
                maxLength={120}
                style={{ ...inputStyle, ...(fieldErrors.title ? errorBorderStyle : {}) }}
              />
              {fieldErrors.title && <p style={fieldErrorStyle}>{fieldErrors.title}</p>}
            </div>

            {/* Description */}
            <div style={fieldStyle}>
              <div style={labelRowStyle}>
                <label style={labelStyle}>Description</label>
                <span style={charCountStyle}>{charDesc}/2000</span>
              </div>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="What problem does it solve? Who is it for? Why now?"
                maxLength={2000}
                rows={5}
                style={{ ...inputStyle, resize: 'vertical', ...(fieldErrors.description ? errorBorderStyle : {}) }}
              />
              {fieldErrors.description && <p style={fieldErrorStyle}>{fieldErrors.description}</p>}
            </div>

            {/* Category */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Category</label>
              <input
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                placeholder="e.g. DeFi, Consumer, AI, Infrastructure…"
                maxLength={50}
                style={{ ...inputStyle, ...(fieldErrors.category ? errorBorderStyle : {}) }}
              />
              {fieldErrors.category && <p style={fieldErrorStyle}>{fieldErrors.category}</p>}
            </div>

            {/* Anonymous toggle */}
            <label style={toggleRowStyle}>
              <input
                type="checkbox"
                checked={form.isAnonymous}
                onChange={(e) => update('isAnonymous', e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={toggleLabelStyle}>Submit anonymously</span>
              <span style={mutedStyle}>(your wallet address won't be shown)</span>
            </label>

            {/* Contract notice */}
            {hasContract && (
              <p style={contractNoteStyle}>
                🔗 On-chain registration will open your wallet for confirmation.
              </p>
            )}

            <button type="submit" style={primaryButtonStyle} disabled={!isAuthenticated}>
              {!isAuthenticated ? 'Sign in to pitch' : hasContract ? 'Pitch it →' : 'Drop Pitch (off-chain)'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position:        'fixed',
  inset:           0,
  background:      'rgba(0,0,0,0.75)',
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
  zIndex:          100,
  padding:         '16px',
}

const modalStyle: React.CSSProperties = {
  background:    '#111',
  border:        '1px solid #222',
  borderRadius:  '16px',
  padding:       '28px',
  width:         '100%',
  maxWidth:      '560px',
  maxHeight:     '90vh',
  overflowY:     'auto',
  display:       'flex',
  flexDirection: 'column',
  gap:           '24px',
}

const headerStyle: React.CSSProperties = {
  display:        'flex',
  justifyContent: 'space-between',
  alignItems:     'center',
}

const modalTitleStyle: React.CSSProperties = {
  fontSize:   '20px',
  fontWeight: 700,
  margin:     0,
}

const closeButtonStyle: React.CSSProperties = {
  background:   'transparent',
  border:       'none',
  color:        '#888',
  fontSize:     '18px',
  cursor:       'pointer',
  lineHeight:   1,
  padding:      '4px',
}

const formStyle: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  gap:           '20px',
}

const fieldStyle: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  gap:           '6px',
}

const labelRowStyle: React.CSSProperties = {
  display:        'flex',
  justifyContent: 'space-between',
  alignItems:     'baseline',
}

const labelStyle: React.CSSProperties = {
  fontSize:   '13px',
  fontWeight: 600,
  color:      '#ccc',
}

const charCountStyle: React.CSSProperties = {
  fontSize: '11px',
  color:    '#555',
}

const inputStyle: React.CSSProperties = {
  background:   '#0a0a0a',
  border:       '1px solid #2a2a2a',
  borderRadius: '8px',
  padding:      '10px 14px',
  color:        '#ededed',
  fontSize:     '14px',
  outline:      'none',
  width:        '100%',
  boxSizing:    'border-box',
}

const errorBorderStyle: React.CSSProperties = {
  border: '1px solid #ef4444',
}

const fieldErrorStyle: React.CSSProperties = {
  color:    '#ef4444',
  fontSize: '12px',
  margin:   0,
}

const toggleRowStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        '8px',
  cursor:     'pointer',
}

const toggleLabelStyle: React.CSSProperties = {
  fontSize:   '13px',
  fontWeight: 600,
  color:      '#ccc',
}

const mutedStyle: React.CSSProperties = {
  fontSize: '12px',
  color:    '#666',
  margin:   0,
}

const contractNoteStyle: React.CSSProperties = {
  fontSize:     '12px',
  color:        '#888',
  background:   '#1a1a1a',
  border:       '1px solid #222',
  borderRadius: '6px',
  padding:      '8px 12px',
  margin:       0,
}

const primaryButtonStyle: React.CSSProperties = {
  background:   '#6366f1',
  color:        '#fff',
  border:       'none',
  borderRadius: '10px',
  padding:      '12px 24px',
  fontSize:     '15px',
  fontWeight:   600,
  cursor:       'pointer',
  width:        '100%',
}

const secondaryButtonStyle: React.CSSProperties = {
  background:   'transparent',
  color:        '#888',
  border:       '1px solid #333',
  borderRadius: '8px',
  padding:      '8px 20px',
  fontSize:     '14px',
  cursor:       'pointer',
}

const submittingStyle: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  alignItems:    'center',
  gap:           '12px',
  padding:       '24px 0',
}

const spinnerStyle: React.CSSProperties = {
  fontSize: '36px',
}

const successStyle: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  alignItems:    'center',
  gap:           '12px',
  padding:       '24px 0',
  textAlign:     'center',
}

const successEmojiStyle: React.CSSProperties = {
  fontSize: '48px',
}

const successTextStyle: React.CSSProperties = {
  fontSize:   '20px',
  fontWeight: 700,
  margin:     0,
}

const errorBlockStyle: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  alignItems:    'center',
  gap:           '16px',
}

const errorTextStyle: React.CSSProperties = {
  color:  '#ef4444',
  margin: 0,
}
