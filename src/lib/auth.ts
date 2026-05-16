import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

/** Thrown when the credentials are valid but email verification is outstanding.
 *  NextAuth v5 surfaces `code` on the client via `signIn(...).code`. */
class EmailNotVerifiedError extends CredentialsSignin {
  code = 'email_not_verified'
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const useSecureCookies = process.env.NODE_ENV === 'production'

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  // Explicit cookie config — don't rely on NextAuth defaults silently changing.
  // httpOnly: blocks JS access (XSS mitigation). sameSite 'lax': blocks CSRF on
  // cross-site POSTs while keeping top-level nav from email links working.
  // secure: only sent over HTTPS in production.
  cookies: {
    sessionToken: {
      name:    useSecureCookies ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: useSecureCookies },
    },
    csrfToken: {
      name:    useSecureCookies ? '__Host-authjs.csrf-token' : 'authjs.csrf-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: useSecureCookies },
    },
    callbackUrl: {
      name:    useSecureCookies ? '__Secure-authjs.callback-url' : 'authjs.callback-url',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: useSecureCookies },
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user || user.deletedAt) return null

        const passwordValid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!passwordValid) return null

        // Block login when an email verification is still outstanding.
        // New signups get a token; legacy/seeded users without one are grandfathered.
        if (user.emailVerifyToken && !user.emailVerified) {
          throw new EmailNotVerifiedError()
        }

        return {
          id:           user.id,
          email:        user.email,
          role:         user.role,
          medIntelCode: user.medIntelCode ?? '',
          kycStatus:    user.kycStatus,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.medIntelCode = user.medIntelCode
        token.kycStatus = user.kycStatus
      }
      return token
    },
    session({ session, token }) {
      session.user.id           = token.sub!
      session.user.role         = token.role
      session.user.medIntelCode = token.medIntelCode
      session.user.kycStatus    = token.kycStatus
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
