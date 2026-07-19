import '@auth/core/types'

declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      roles: string[]
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    roles?: string[]
  }
}
