'use client'

import { usePrivy, useWallets, getEmbeddedConnectedWallet } from '@privy-io/react-auth'
import type { Address } from 'viem'

export function useAuth() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { wallets } = useWallets()

  const embeddedWallet = getEmbeddedConnectedWallet(wallets)
  const walletAddress = (embeddedWallet?.address ??
    wallets[0]?.address ??
    undefined) as Address | undefined

  return {
    ready,
    isAuthenticated: authenticated,
    user,
    walletAddress,
    login,
    logout,
  }
}
