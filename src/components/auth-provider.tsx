'use client'

import { SessionProvider } from 'next-auth/react'

/**
 * NextAuth SessionProvider wrapper
 * This is a client component that wraps the app with session context
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
