/**
 * Geo-blocking logic for pitchdrop.
 *
 * pitchdrop is not available to US residents or Tor exit-node users
 * for regulatory compliance reasons.
 *
 * Country codes come from the Cloudflare `CF-IPCountry` request header:
 *   - ISO 3166-1 alpha-2 for normal IPs
 *   - "T1" for Tor exit nodes
 *   - "XX" for unknown / Cloudflare couldn't determine the country
 */

/** Countries blocked from accessing pitchdrop. */
export const BLOCKED_COUNTRIES = new Set(['US', 'T1'])

/**
 * Returns true if the given Cloudflare country code should be blocked.
 * Passing `null` or `undefined` (header absent — local / non-CF traffic)
 * is treated as allowed so development and direct-origin requests work.
 */
export function isBlockedCountry(country: string | null | undefined): boolean {
  if (!country) return false
  return BLOCKED_COUNTRIES.has(country.toUpperCase())
}
