import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^superjson$': '<rootDir>/src/test/superjson-jest.ts',
    '^@auth/core/providers/zitadel$':
      '<rootDir>/src/test/zitadel-provider-jest.ts',
    '^@auth/prisma-adapter$': '<rootDir>/src/test/prisma-adapter-jest.ts',
    '^@zitadel/next-auth$': '<rootDir>/src/test/zitadel-next-auth-jest.ts',
  },
}

export default createJestConfig(config)
