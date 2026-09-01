'use client'

import { AuthProvider } from '@/components/auth-provider'
import { GroupsProvider } from '@/contexts'
import { TRPCProvider } from '@/trpc/client'
import { PropsWithChildren } from 'react'

/**
 * Upstream's TRPCProvider plus the two this fork adds - the Auth.js session
 * provider and the groups/sync context - in the order they must nest:
 * GroupsProvider consumes tRPC hooks, so it has to sit inside the query
 * client, and HeaderAuthSection consumes the session, so AuthProvider has to
 * wrap the header.
 *
 * Composed here and substituted for the `<TRPCProvider>` element in
 * layout.tsx, which makes the fork's providers two changed lines there
 * instead of an extra nesting level. That nesting was re-indenting the whole
 * header and footer, turning a handful of real changes into a ~100-line diff
 * against upstream and a guaranteed conflict whenever they touched either.
 */
export function ForkAppProviders({ children }: PropsWithChildren) {
  return (
    <TRPCProvider>
      <AuthProvider>
        <GroupsProvider>{children}</GroupsProvider>
      </AuthProvider>
    </TRPCProvider>
  )
}
