/* eslint-disable @typescript-eslint/no-empty-object-type */
import NextAuth from 'next-auth'

import type { Role } from '@/prisma/generated/client'

interface UserSession {
  id?: string
  name?: string
  email?: string
  image?: string | null
  view?: View
  roleId?: string
  accessToken?: string
  refreshToken?: string | null
  remember?: boolean
  accessTokenExpires?: number
}

declare module 'next-auth/jwt' {
  interface JWT extends UserSession {}
}

declare module 'next-auth' {
  interface JWTUser extends UserSession {}
  interface Session {
    user: UserSession
  }

  interface User extends UserSession {
    role?: Role
    username?: string
    status?: Status
    password?: string | null
  }
}
