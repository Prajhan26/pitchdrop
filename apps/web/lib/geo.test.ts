import { describe, it, expect } from 'vitest'
import { isBlockedCountry, BLOCKED_COUNTRIES } from './geo'

describe('isBlockedCountry', () => {
  it('blocks US', () => {
    expect(isBlockedCountry('US')).toBe(true)
  })

  it('blocks lowercase us (case-insensitive)', () => {
    expect(isBlockedCountry('us')).toBe(true)
  })

  it('blocks Tor exit nodes (T1)', () => {
    expect(isBlockedCountry('T1')).toBe(true)
  })

  it('allows GB', () => {
    expect(isBlockedCountry('GB')).toBe(false)
  })

  it('allows DE', () => {
    expect(isBlockedCountry('DE')).toBe(false)
  })

  it('allows unknown country code XX (fail-open)', () => {
    expect(isBlockedCountry('XX')).toBe(false)
  })

  it('allows null — header absent (dev / direct-origin traffic)', () => {
    expect(isBlockedCountry(null)).toBe(false)
  })

  it('allows undefined', () => {
    expect(isBlockedCountry(undefined)).toBe(false)
  })

  it('allows empty string', () => {
    expect(isBlockedCountry('')).toBe(false)
  })
})

describe('BLOCKED_COUNTRIES', () => {
  it('contains US and T1', () => {
    expect(BLOCKED_COUNTRIES.has('US')).toBe(true)
    expect(BLOCKED_COUNTRIES.has('T1')).toBe(true)
  })
})
