import { hashGroupId } from './utils'

describe('Sync Utils', () => {
  describe('hashGroupId', () => {
    it('returns a 64-character hex string', () => {
      const hash = hashGroupId('test-group-id')

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('produces same hash for same input', () => {
      const groupId = 'my-group-123'

      const hash1 = hashGroupId(groupId)
      const hash2 = hashGroupId(groupId)

      expect(hash1).toBe(hash2)
    })

    it('produces different hashes for different inputs', () => {
      const hash1 = hashGroupId('group-1')
      const hash2 = hashGroupId('group-2')

      expect(hash1).not.toBe(hash2)
    })

    it('handles empty string', () => {
      const hash = hashGroupId('')

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('handles special characters', () => {
      const hash = hashGroupId('group-with-special-chars-!@#$%^&*()')

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('handles unicode characters', () => {
      const hash = hashGroupId('group-with-émojis-🎉✨')

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('produces consistent hashes (known test vectors)', () => {
      // SHA-256 of "test" is a known value
      const hash = hashGroupId('test')

      // Should produce deterministic output
      expect(hash).toBe(
        '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      )
    })

    it('handles very long input', () => {
      const longId = 'a'.repeat(10000)
      const hash = hashGroupId(longId)

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})
