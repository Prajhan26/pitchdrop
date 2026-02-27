const TRM_API_KEY = process.env.TRM_API_KEY ?? ''

export type ScreeningResult = {
  address:   string
  blocked:   boolean
  riskScore: number
  reason:    string | null
}

export async function screenAddress(address: string): Promise<ScreeningResult> {
  if (!TRM_API_KEY) return { address, blocked: false, riskScore: 0, reason: null }
  try {
    const res = await fetch('https://api.trmlabs.com/public/v2/screening/addresses', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${TRM_API_KEY}:`).toString('base64')}`,
      },
      body: JSON.stringify([{ address }]),
    })
    if (!res.ok) return { address, blocked: false, riskScore: 0, reason: null }
    const data = await res.json() as Array<{ riskIndicators?: Array<{ riskType: string }> }>
    const isBlocked = data[0]?.riskIndicators?.some(r => r.riskType === 'SANCTIONS') ?? false
    return { address, blocked: isBlocked, riskScore: isBlocked ? 100 : 0, reason: isBlocked ? 'OFAC sanctions match' : null }
  } catch { return { address, blocked: false, riskScore: 0, reason: null } }
}
