import { AuthButton } from './components/AuthButton'

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '24px',
      }}
    >
      <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>pitchdrop</h1>
      <p style={{ opacity: 0.6, fontSize: '1rem' }}>
        The world&apos;s first perception market
      </p>
      <AuthButton />
    </main>
  )
}
