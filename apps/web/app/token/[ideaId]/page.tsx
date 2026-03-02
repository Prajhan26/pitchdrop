'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  useBondingCurve, useTokensForEth, useBuyTokens, formatEther,
} from '../../hooks/useTokenMarket'
import { useAuth } from '../../hooks/useAuth'
import { AuthButton } from '../../components/AuthButton'

// ─── Token ticker (derived from idea name initials) ────────────────────────────
const TICKER = 'TGG'  // Token-Gated Group chats

// ─── Mock ETH→USD rate (production: Chainlink / Pyth oracle) ──────────────────
const ETH_USD = 3_200

// ─── OHLC candle data — 30 bars showing upward bonding-curve price action ─────
// Each entry: [open, high, low, close, volume]
// Prices in nanoETH/token (×1e-9 ETH). Vol = arbitrary liquidity units.
const CANDLES: [number, number, number, number, number][] = [
  [30, 32, 29, 31, 12], [31, 32, 29, 30,  8], [30, 34, 30, 33, 15],
  [33, 34, 31, 32, 10], [32, 36, 32, 35, 18], [35, 38, 35, 37, 20],
  [37, 38, 35, 36, 14], [36, 40, 36, 39, 22], [39, 42, 38, 41, 25],
  [41, 42, 39, 40, 16], [40, 44, 40, 43, 28], [43, 44, 41, 42, 18],
  [42, 46, 42, 45, 30], [45, 48, 44, 47, 22], [47, 48, 45, 46, 15],
  [46, 50, 46, 49, 32], [49, 52, 49, 51, 35], [51, 52, 49, 50, 20],
  [50, 54, 50, 53, 38], [53, 56, 52, 55, 30], [55, 56, 53, 54, 22],
  [54, 58, 54, 57, 42], [57, 58, 55, 56, 28], [56, 60, 56, 59, 45],
  [59, 60, 57, 58, 32], [58, 62, 58, 61, 48], [61, 64, 61, 63, 52],
  [63, 64, 61, 62, 35], [62, 66, 62, 65, 55], [65, 70, 65, 68, 60],
]

// ─── Live buy activity (newest-first) ─────────────────────────────────────────
const DEMO_TRADES = [
  { addr: '0xDfbc887C', tokens: '100K', usd: '$16.00', ago: 'just now', side: 'buy' },
  { addr: '0x9F39c8C2', tokens:  '82K', usd: '$12.80', ago: '2m ago',   side: 'buy' },
  { addr: '0x3D4E5F6A', tokens: '147K', usd: '$22.40', ago: '4m ago',   side: 'buy' },
  { addr: '0x1A2B3C4D', tokens:  '64K', usd:  '$9.60', ago: '7m ago',   side: 'buy' },
  { addr: '0x9F39c8C2', tokens: '220K', usd: '$32.00', ago: '11m ago',  side: 'buy' },
  { addr: '0xDfbc887C', tokens: '135K', usd: '$19.20', ago: '14m ago',  side: 'buy' },
  { addr: '0x3D4E5F6A', tokens:  '46K', usd:  '$6.40', ago: '18m ago',  side: 'buy' },
  { addr: '0x1A2B3C4D', tokens:  '95K', usd: '$12.80', ago: '23m ago',  side: 'buy' },
  { addr: '0x9F39c8C2', tokens: '195K', usd: '$25.60', ago: '28m ago',  side: 'buy' },
  { addr: '0xDfbc887C', tokens:  '76K', usd:  '$9.60', ago: '33m ago',  side: 'buy' },
  { addr: '0x3D4E5F6A', tokens: '130K', usd: '$16.00', ago: '39m ago',  side: 'buy' },
  { addr: '0x1A2B3C4D', tokens:  '55K', usd:  '$6.40', ago: '45m ago',  side: 'buy' },
]

// ─── Price formatting helpers ─────────────────────────────────────────────────

/** nanoETH units → clean USD string  e.g. 68 → "$0.0002176" */
function nanoToUSD(nano: number): string {
  const usd = nano * 1e-9 * ETH_USD
  const s = usd.toFixed(7)
  // Strip trailing zeros but keep at least 4 significant figs after decimal
  const trimmed = s.replace(/(\.\d+?)0+$/, '$1')
  return `$${trimmed}`
}

/** Compact USD for stat pills  e.g. 274 → "$274", 1_800_000 → "$1.8M" */
function compactUSD(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`
  if (usd >= 1_000)     return `$${(usd / 1_000).toFixed(1)}K`
  return `$${Math.round(usd)}`
}

// ─── Candlestick chart ────────────────────────────────────────────────────────
function CandleChart() {
  const W = 700, CH = 210, VH = 55, GAP = 8, H = CH + GAP + VH
  const padL = 8, padR = 60, padT = 14, padB = 4

  const usableW = W - padL - padR         // 632
  const slotW   = usableW / CANDLES.length
  const bodyW   = slotW * 0.58

  const allPrices = CANDLES.flatMap(([o, h, l, c]) => [o, h, l, c])
  const pMin = Math.min(...allPrices) - 2
  const pMax = Math.max(...allPrices) + 2
  const pRange = pMax - pMin

  const chartH = CH - padT - padB
  const pToY = (p: number) => padT + (1 - (p - pMin) / pRange) * chartH

  const vMax = Math.max(...CANDLES.map(c => c[4]))
  const vToH = (v: number) => (v / vMax) * VH * 0.9

  // 5 horizontal price levels for Y-axis
  const yLabels = [0.1, 0.3, 0.5, 0.7, 0.9].map(f => ({
    y: padT + f * chartH,
    p: pMax - f * pRange,
  }))

  // X-axis time labels
  const timeLabels = ['45m', '35m', '25m', '15m', '5m', 'now']
  const lastClose = CANDLES[CANDLES.length - 1]![3]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', display: 'block' }}
      preserveAspectRatio="none"
    >
      {/* Background */}
      <rect width={W} height={H} fill="#0a0a0a" />

      {/* Horizontal grid lines */}
      {yLabels.map(({ y }, i) => (
        <line key={i} x1={padL} y1={y} x2={W - padR} y2={y}
          stroke="#161616" strokeWidth="1" />
      ))}

      {/* Y-axis USD price labels */}
      {yLabels.map(({ y, p }, i) => (
        <text key={i} x={W - padR + 5} y={y + 3.5}
          fontSize="8.5" fill="#6b7280" fontFamily="monospace" textAnchor="start">
          {nanoToUSD(p)}
        </text>
      ))}

      {/* Separator line: chart / volume */}
      <line x1={padL} y1={CH} x2={W - padR} y2={CH} stroke="#1f1f1f" strokeWidth="1" />

      {/* Candles */}
      {CANDLES.map(([o, h, l, c, v], i) => {
        const isGreen = c >= o
        const color   = isGreen ? '#22c55e' : '#ef4444'
        const xCenter = padL + i * slotW + slotW / 2
        const bodyX   = xCenter - bodyW / 2

        const yO = pToY(o), yC = pToY(c)
        const yH = pToY(h), yL = pToY(l)
        const bodyTop = Math.min(yO, yC)
        const bodyH   = Math.max(Math.abs(yO - yC), 1.5)

        const volH = vToH(v)
        const volY = H - padB - volH

        return (
          <g key={i}>
            {/* Wick */}
            <line x1={xCenter} y1={yH} x2={xCenter} y2={yL}
              stroke={color} strokeWidth="1.2" />
            {/* Body */}
            <rect x={bodyX} y={bodyTop} width={bodyW} height={bodyH}
              fill={color} rx="1" />
            {/* Volume bar */}
            <rect x={bodyX} y={volY} width={bodyW} height={volH}
              fill={color} opacity="0.3" rx="1" />
          </g>
        )
      })}

      {/* X-axis time labels */}
      {timeLabels.map((t, i) => {
        const idx = Math.round((i / (timeLabels.length - 1)) * (CANDLES.length - 1))
        const x   = padL + idx * slotW + slotW / 2
        return (
          <text key={t} x={x} y={H - 1}
            fontSize="8" fill="#4b5563" fontFamily="monospace" textAnchor="middle">
            {t}
          </text>
        )
      })}

      {/* Current price dashed line + USD label box */}
      {(() => {
        const y     = pToY(lastClose)
        const label = nanoToUSD(lastClose)  // e.g. "$0.0002176"
        return (
          <g>
            <line x1={padL} y1={y} x2={W - padR} y2={y}
              stroke="#22c55e" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.7" />
            <rect x={W - padR} y={y - 7} width={padR - 2} height={14}
              fill="#22c55e" rx="2" />
            <text
              x={W - padR + (padR - 2) / 2} y={y + 3.5}
              fontSize="7.5" fill="#000" fontFamily="monospace"
              textAnchor="middle" fontWeight="700"
            >
              {label}
            </text>
          </g>
        )
      })()}
    </svg>
  )
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────
function fmt(raw: bigint, d = 4): string {
  const n = Number(formatEther(raw))
  if (n === 0) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(2)}K`
  return n.toLocaleString(undefined, { maximumFractionDigits: d })
}

function pct(raised: bigint | undefined, target: bigint | undefined) {
  if (!raised || !target || target === 0n) return 0
  return Math.min(Number((raised * 10000n) / target) / 100, 100)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TokenMarketPage() {
  const params       = useParams<{ ideaId: string }>()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()

  const ideaId       = params.ideaId
  const curveParam   = searchParams.get('curve')
  const curveAddress = curveParam ? (curveParam as `0x${string}`) : undefined

  const { totalRaised, graduated, graduationTarget } = useBondingCurve(curveAddress)
  const [ethInput, setEthInput]   = useState('')
  const { tokensOut, isLoading: quoteLoading } = useTokensForEth(curveAddress, ethInput)
  const { buy, isPending: buyPending, error: buyError } = useBuyTokens(curveAddress)

  const [txHash, setTxHash]       = useState<string | undefined>()
  const [txError, setTxError]     = useState<string | undefined>()
  const [timeframe, setTimeframe] = useState('5m')

  const progress = pct(totalRaised, graduationTarget)

  // ── Derived price values ───────────────────────────────────────────────────
  const lastCandle    = CANDLES[CANDLES.length - 1]!
  const firstCandle   = CANDLES[0]!
  const curPriceNano  = lastCandle[3]   // 68 nanoETH/token
  const firstPriceN   = firstCandle[0]  // 30 nanoETH/token
  const priceChangeP  = ((curPriceNano - firstPriceN) / firstPriceN * 100).toFixed(1)
  const curPriceUSD   = curPriceNano * 1e-9 * ETH_USD           // ~0.0002176
  const mcapUSD       = compactUSD(curPriceUSD * 1_260_000)     // ~$274
  const vol24hUSD     = compactUSD(0.059 * ETH_USD)             // ~$189

  async function handleBuy() {
    if (!ethInput) return
    setTxError(undefined); setTxHash(undefined)
    try {
      const hash = await buy(ethInput)
      if (hash) setTxHash(hash)
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Transaction failed')
    }
  }

  // ── No curve address ───────────────────────────────────────────────────────
  if (!curveAddress) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f1f5f9' }}>
        <Nav ideaId={ideaId} />
        <main style={{ maxWidth: '760px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '40px', margin: '0 0 16px' }}>⏳</p>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Trading opens after the community vote</h2>
          <p style={{ fontSize: '14px', color: '#64748b' }}>Once this idea reaches 69% approval its token launches automatically.</p>
        </main>
      </div>
    )
  }

  // ── Graduated ─────────────────────────────────────────────────────────────
  if (graduated) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f1f5f9' }}>
        <Nav ideaId={ideaId} />
        <main style={{ maxWidth: '760px', margin: '0 auto', padding: '36px 24px 80px' }}>
          <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '16px', padding: '28px 32px', marginBottom: '28px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '4px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', fontFamily: 'monospace' }}>GRADUATED</span>
            <h2 style={{ margin: '12px 0 6px', fontSize: '20px', fontWeight: 700, color: '#fbbf24' }}>Now trading on Aerodrome DEX</h2>
            <a href="https://aerodrome.finance" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '8px', padding: '10px 22px', borderRadius: '8px', background: '#fbbf24', color: '#0a0a0a', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>Trade on Aerodrome →</a>
          </div>
        </main>
      </div>
    )
  }

  // ── Trading live ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f1f5f9' }}>
      <Nav ideaId={ideaId} />

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '0 0 80px' }}>

        {/* ── DexScreener-style token info bar ──────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
          padding: '14px 20px', borderBottom: '1px solid #141414',
          background: '#0d0d0d',
        }}>
          {/* Logo + ticker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 800, color: '#fff',
            }}>
              {TICKER[0]}
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#f1f5f9' }}>${TICKER}</div>
              <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>Base · Bonding Curve</div>
            </div>
          </div>

          {/* Price — USD prominent, ETH secondary */}
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'monospace', lineHeight: 1 }}>
              {nanoToUSD(curPriceNano)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                {(curPriceNano * 1e-9).toFixed(9)} ETH
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>
                ▲ {priceChangeP}%
              </span>
            </div>
          </div>

          {/* Stats pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>
            {[
              { label: '24h Vol', value: vol24hUSD },
              { label: 'MCap',    value: mcapUSD },
              { label: 'Liq',     value: `${Number(formatEther(totalRaised ?? 0n)).toFixed(3)} ETH` },
              { label: 'Buys',    value: String(DEMO_TRADES.length) },
            ].map(({ label, value }) => (
              <div key={label} style={{
                textAlign: 'center', padding: '5px 12px',
                background: '#111', borderRadius: '6px', border: '1px solid #1e1e1e',
              }}>
                <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Candlestick chart ──────────────────────────────────────────── */}
        <div style={{ background: '#0a0a0a', borderBottom: '1px solid #141414' }}>

          {/* Timeframe selector + LIVE dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', borderBottom: '1px solid #111' }}>
            {['1m', '5m', '15m', '1h'].map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)} style={{
                padding: '3px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                fontSize: '11px', fontWeight: 700, fontFamily: 'monospace',
                background: timeframe === tf ? '#1e2d3d' : 'transparent',
                color:      timeframe === tf ? '#60a5fa' : '#64748b',
              }}>
                {tf}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', fontFamily: 'monospace', letterSpacing: '0.06em' }}>LIVE</span>
            </div>
          </div>

          <CandleChart />
        </div>

        {/* ── Buy panel + recent trades ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>

          {/* Buy panel */}
          <div style={{ padding: '18px', borderRight: '1px solid #141414', borderBottom: '1px solid #141414' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: '12px' }}>
              Buy ${TICKER}
            </div>

            {!isAuthenticated ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '14px' }}>Connect wallet to trade</p>
                <AuthButton />
              </div>
            ) : (
              <>
                <input
                  type="number" min="0" step="0.001" placeholder="0.01 ETH"
                  value={ethInput} onChange={e => setEthInput(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box', marginBottom: '8px',
                    padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #2a2a2a', background: '#0d0d0d',
                    color: '#f1f5f9', fontSize: '15px', outline: 'none',
                  }}
                />
                <div style={{
                  padding: '8px 12px', borderRadius: '8px',
                  background: '#111', border: '1px solid #1a1a1a',
                  marginBottom: '10px', fontSize: '13px', color: '#64748b',
                }}>
                  {quoteLoading
                    ? 'Calculating…'
                    : tokensOut !== undefined
                      ? <><span style={{ color: '#64748b' }}>→ </span><strong style={{ color: '#f1f5f9' }}>{fmt(tokensOut, 0)} ${TICKER}</strong></>
                      : `Enter ETH to see ${TICKER} amount`}
                </div>
                <button
                  onClick={handleBuy}
                  disabled={buyPending || !ethInput || Number(ethInput) <= 0}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                    fontSize: '14px', fontWeight: 800,
                    cursor: buyPending || !ethInput || Number(ethInput) <= 0 ? 'not-allowed' : 'pointer',
                    background: buyPending || !ethInput || Number(ethInput) <= 0 ? '#1e1e1e' : '#22c55e',
                    color:      buyPending || !ethInput || Number(ethInput) <= 0 ? '#64748b' : '#000',
                  }}
                >
                  {buyPending ? 'Confirming…' : `↑ Buy ${TICKER}`}
                </button>
                <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
                  price rises with every buy · 5% slippage
                </p>
                {txHash && (
                  <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: '11px', color: '#22c55e' }}>
                    ✓ Confirmed! <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e' }}>Basescan →</a>
                  </div>
                )}
                {(txError || buyError) && (
                  <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '11px', color: '#f87171' }}>
                    {txError ?? buyError?.message}
                  </div>
                )}
              </>
            )}

            {/* Graduation progress */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #141414' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '5px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Progress to DEX graduation</span>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{progress.toFixed(2)}%</span>
              </div>
              <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '999px',
                  width: `${Math.max(progress, 0.8)}%`,
                  background: 'linear-gradient(90deg, #6366f1, #22c55e)',
                }} />
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                {totalRaised ? `${Number(formatEther(totalRaised)).toFixed(4)} ETH` : '0 ETH'} raised of 20 ETH
              </div>
            </div>
          </div>

          {/* Recent trades */}
          <div style={{ padding: '18px', borderBottom: '1px solid #141414' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: '12px' }}>
              Recent trades
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Column headers */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '4px',
                fontSize: '9px', color: '#64748b', fontFamily: 'monospace',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px solid #111',
              }}>
                <span>Wallet</span>
                <span style={{ textAlign: 'right' }}>Amount</span>
                <span style={{ textAlign: 'right' }}>USD</span>
                <span style={{ textAlign: 'right' }}>Time</span>
              </div>
              {DEMO_TRADES.map((t, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '4px',
                  fontSize: '11px', fontFamily: 'monospace', padding: '3px 0',
                  background: i === 0 ? 'rgba(34,197,94,0.04)' : 'transparent',
                  borderRadius: '4px',
                }}>
                  <span style={{ color: '#64748b' }}>{t.addr}</span>
                  <span style={{ color: '#22c55e', textAlign: 'right', fontWeight: 700 }}>+{t.tokens}</span>
                  <span style={{ color: '#94a3b8', textAlign: 'right' }}>{t.usd}</span>
                  <span style={{ color: '#64748b', textAlign: 'right' }}>{t.ago}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BuildFund milestone tracker ────────────────────────────────── */}
        <div style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              BuildFund — Milestone Release
            </div>
            <span style={{ padding: '2px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', fontFamily: 'monospace' }}>
              ⚡ EIGENCLOUD TEE
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            {[
              { pct: '85%', label: '→ Aerodrome DEX', sub: 'Liquidity pool', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
              { pct: '15%', label: '→ BuildFund.sol', sub: 'EigenCloud releases', color: '#818cf8', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)' },
            ].map(({ pct: p, label, sub, color, bg, border }) => (
              <div key={p} style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: bg, border: `1px solid ${border}` }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color, fontFamily: 'monospace' }}>{p}</div>
                <div style={{ fontSize: '11px', color, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {[
              { num: 'M1', label: 'Ship MVP', sub: 'Builder submits demo proof', share: '33%', status: 'pending' },
              { num: 'M2', label: 'Reach 1,000 users', sub: 'On-chain usage evidence', share: '33%', status: 'locked' },
              { num: 'M3', label: 'Full product live', sub: 'Public launch + retention', share: '34%', status: 'locked' },
            ].map(({ num, label, sub, share, status }) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: status === 'pending' ? 'rgba(245,158,11,0.1)' : '#0a0a0a',
                  border: `1px solid ${status === 'pending' ? 'rgba(245,158,11,0.4)' : '#222'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 800, fontFamily: 'monospace',
                  color: status === 'pending' ? '#fbbf24' : '#374151',
                }}>
                  {num}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>{label}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{sub}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', fontFamily: 'monospace' }}>{share}</div>
                  <div style={{ fontSize: '9px', fontWeight: 800, color: status === 'pending' ? '#fbbf24' : '#374151', fontFamily: 'monospace' }}>
                    {status === 'pending' ? 'PENDING' : '🔒'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '8px', padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
            {['Builder submits proof', '→', 'EigenCloud TEE', '→', 'BuildFund.release()', '→', 'ETH to builder'].map((s, i) => (
              <span key={i} style={{ fontSize: '10px', color: s === '→' ? '#2a2a2a' : '#94a3b8', fontWeight: s === '→' ? 400 : 600, fontFamily: 'monospace' }}>{s}</span>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 800, color: '#6366f1', fontFamily: 'monospace' }}>NO ADMIN KEY</span>
          </div>
        </div>

      </main>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Nav({ ideaId }: { ideaId: string }) {
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #1a1a1a', padding: '0 20px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Link href="/feed" style={{ textDecoration: 'none', fontWeight: 700, fontSize: '16px', color: '#6366f1' }}>pitchdrop</Link>
        <Link href="/feed" style={{ textDecoration: 'none', fontSize: '12px', color: '#64748b' }}>← Feed</Link>
        <span style={{ fontSize: '12px', color: '#64748b' }}>#{ideaId}</span>
      </div>
      <AuthButton />
    </nav>
  )
}
