import jwt from 'jsonwebtoken'

import { JsonResponse } from '@/libs/Response'
import { prisma } from '@/libs/prisma'

const JWT_SECRET = process.env.NEXTAUTH_SECRET ?? ''
const TOKEN_EXPIRES = process.env.TOKEN_EXPIRES as string

export async function POST(req: Request) {
  try {
    const { refreshToken } = await req.json()

    if (!refreshToken) {
      return JsonResponse({ message: ['Refresh token required'], status: 401 })
    }

    // Verifikasi validitas Refresh Token
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any

    if (!decoded || decoded.type !== 'refresh') {
      return JsonResponse({ message: ['Invalid token type'], status: 401 })
    }

    // Pastikan user masih ada di database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true }
    })

    if (!user) {
      return JsonResponse({ message: ['User not found'], status: 401 })
    }

    // Generate Access Token baru
    const newAccessToken = jwt.sign({ id: user.id, username: user.username, type: 'access' }, JWT_SECRET, {
      expiresIn: (TOKEN_EXPIRES ? Number(TOKEN_EXPIRES) : '2d') as jwt.SignOptions['expiresIn']
    })

    return JsonResponse({
      data: { accessToken: newAccessToken },
      message: ['ok'],
      status: 200
    })
  } catch (error) {
    return JsonResponse({ message: ['Refresh token expired or invalid'], status: 401 })
  }
}
