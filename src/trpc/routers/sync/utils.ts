import { createHash } from 'crypto'

/**
 * Hash a group ID using SHA-256
 * Returns hex string (64 characters)
 */
export function hashGroupId(groupId: string): string {
  return createHash('sha256').update(groupId).digest('hex')
}
