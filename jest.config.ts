import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  // Jest's default testMatch would pick up the Playwright specs, which must be
  // run with `npx playwright test` instead. `tests/` is this fork's own
  // Playwright directory, kept alongside upstream's `e2e/`.
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/tests/',
  ],
  // These four packages ship ESM-only builds that Jest's CJS transform cannot
  // load. Each stub stands in for the module's runtime surface; see the files
  // themselves for what they fake and why.
  moduleNameMapper: {
    '^superjson$': '<rootDir>/src/test/superjson-jest.ts',
    '^@auth/core/providers/zitadel$':
      '<rootDir>/src/test/zitadel-provider-jest.ts',
    '^@auth/prisma-adapter$': '<rootDir>/src/test/prisma-adapter-jest.ts',
    '^@zitadel/next-auth$': '<rootDir>/src/test/zitadel-next-auth-jest.ts',
    '^nanoid$': '<rootDir>/src/test/nanoid-jest.ts',
  },
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
