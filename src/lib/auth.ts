import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getServerSession as nextAuthGetServerSession } from 'next-auth'

export { authOptions }

/**
 * Helper function to get the current server session
 * Use this in Server Components, Server Actions, and Route Handlers
 */
export async function getServerSession() {
  return nextAuthGetServerSession(authOptions)
}
