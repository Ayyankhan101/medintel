import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user) return null

        const passwordValid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!passwordValid) return null

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
