import { sendEmail } from '@/lib/email'
import { magicLinkEmail } from '@/lib/email-templates'
import { prisma } from '@/lib/prisma'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import type { NextAuthOptions } from 'next-auth'
import NextAuth from 'next-auth'
import type { Adapter, AdapterUser } from 'next-auth/adapters'
import EmailProvider from 'next-auth/providers/email'

// Extend PrismaAdapter to create SyncProfile when user is created
const adapter = PrismaAdapter(prisma)
const extendedAdapter: Adapter = {
  ...adapter,
  async createUser(user: Omit<AdapterUser, 'id'>) {
    const createdUser = await adapter.createUser!(user)
    // Create SyncProfile for the new user
    await prisma.syncProfile.create({
      data: {
        userId: createdUser.id,
      },
    })
    return createdUser
  },
}

export const authOptions: NextAuthOptions = {
  adapter: extendedAdapter,
  session: {
    strategy: 'database',
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  providers: [
    EmailProvider({
      server: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              }
            : undefined,
      },
      from: process.env.EMAIL_FROM || 'noreply@spliit.app',
      async sendVerificationRequest({ identifier: email, url }) {
        // Normalize email to lowercase
        const normalizedEmail = email.toLowerCase()

        const { subject, text, html } = await magicLinkEmail(url, 'Spliit')
        await sendEmail({ to: normalizedEmail, subject, text, html })
      },
      // Normalize email before lookup
      normalizeIdentifier(identifier: string): string {
        return identifier.toLowerCase().trim()
      },
    }),
  ],
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
