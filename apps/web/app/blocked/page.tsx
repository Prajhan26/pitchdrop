import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Not Available — pitchdrop',
  robots: { index: false, follow: false },
}

export default function BlockedPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
        Not available in your region
      </h1>
      <p style={{ opacity: 0.6, maxWidth: '420px', lineHeight: 1.6 }}>
        pitchdrop is not currently available in the United States or certain
        other jurisdictions. If you believe this is an error, please check that
        your connection is not routing through a US-based IP address.
      </p>
    </main>
  )
}
