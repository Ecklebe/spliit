// Relative paths, not the @/ alias: jest.mock()'s module-name resolution
// doesn't go through the same moduleNameMapper substitution regular
// imports do in this project's jest setup (see jest.config.ts's own
// comment on the @/ alias vs. real-package-name shimming distinction).
//
// Each factory is self-contained (a plain literal / jest.fn(), never
// referencing an outer `const`) - jest.mock() calls are hoisted above
// everything else in the file, so referencing an outer variable from
// inside a factory hits a "Cannot access before initialization" error at
// runtime. The mocked module is imported normally below and mutated/
// asserted on directly instead.
jest.mock('../../../lib/env', () => ({
  env: { OIDC_PROVIDERS: [] as string[] },
}))
jest.mock('../../../lib/instance-settings', () => ({
  getInstanceSettings: jest.fn(),
}))
jest.mock('../../../lib/auth', () => ({
  auth: jest.fn(),
}))

import { auth } from '../../../lib/auth'
import { env } from '../../../lib/env'
import { getInstanceSettings } from '../../../lib/instance-settings'
import { assertGroupCreationAllowed } from './require-login-gate'

const mockGetInstanceSettings = getInstanceSettings as jest.Mock
const mockAuth = auth as jest.Mock

const fakeReq = new Request('http://localhost/api/trpc')

beforeEach(() => {
  env.OIDC_PROVIDERS = []
  mockGetInstanceSettings.mockReset()
  mockAuth.mockReset()
})

describe('assertGroupCreationAllowed', () => {
  it('allows creation when no OIDC provider is configured, regardless of the DB setting', async () => {
    env.OIDC_PROVIDERS = []
    mockGetInstanceSettings.mockResolvedValue({
      requireLoginToCreateGroups: true,
    })

    await expect(assertGroupCreationAllowed(fakeReq)).resolves.toBeUndefined()
    // Never even consulted the DB setting - login isn't configured at all,
    // so it must never brick anonymous creation regardless of its value.
    expect(mockGetInstanceSettings).not.toHaveBeenCalled()
  })

  it('allows creation when OIDC is configured but the setting is off', async () => {
    env.OIDC_PROVIDERS = ['zitadel']
    mockGetInstanceSettings.mockResolvedValue({
      requireLoginToCreateGroups: false,
    })

    await expect(assertGroupCreationAllowed(fakeReq)).resolves.toBeUndefined()
    expect(mockAuth).not.toHaveBeenCalled()
  })

  it('rejects an anonymous caller when OIDC is configured and the setting is on', async () => {
    env.OIDC_PROVIDERS = ['zitadel']
    mockGetInstanceSettings.mockResolvedValue({
      requireLoginToCreateGroups: true,
    })
    mockAuth.mockResolvedValue(null)

    await expect(assertGroupCreationAllowed(fakeReq)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })

  it('allows a signed-in caller when OIDC is configured and the setting is on', async () => {
    env.OIDC_PROVIDERS = ['zitadel']
    mockGetInstanceSettings.mockResolvedValue({
      requireLoginToCreateGroups: true,
    })
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    await expect(assertGroupCreationAllowed(fakeReq)).resolves.toBeUndefined()
  })
})
