import bcryptjs from 'bcryptjs'

import jwt from 'jsonwebtoken'

import { JsonResponse } from '@/libs/Response'
import { prisma } from '@/libs/prisma'

const JWT_SECRET = process.env.NEXTAUTH_SECRET ?? ''
const TOKEN_EXPIRES = process.env.TOKEN_EXPIRES as string
const TOKEN_REFRESH_EXPIRES = process.env.TOKEN_REFRESH_EXPIRES as string

export async function POST(req: Request) {
  try {
    // Vars
    const { username, password, id, remember } = await req.json()
    const rememberMe = remember === true || remember === 'true'

    // check to see if email and password is there
    if ((!username || !password) && !id) {
      return JsonResponse({ message: ['Please enter an username and password'], status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: {
        username: username?.toLowerCase(),
        deletedAt: null
      },
      select: {
        id: true,
        username: true,
        password: true,
        name: true,
        image: true,
        role: true
      }
    })

    // if no user was found
    if (!user) {
      return JsonResponse({ message: ['No user found'], status: 401 })
    }

    if (!user?.password) {
      return JsonResponse({ message: ['Password not set, Please log in with a different method.'], status: 401 })
    }

    if (id) {
      if (id !== user.id) {
        return JsonResponse({ message: ['Invalid id'], status: 401 })
      }
    } else {
      // check to see if password matches
      const passwordMatch = await bcryptjs.compare(password, user.password)

      // if password does not match
      if (!passwordMatch || !user || !user?.password) {
        return JsonResponse({ message: ['Email or Password is invalid'], status: 401 })
      }
    }

    const accessToken = jwt.sign({ id: user.id, username: user.username, type: 'access' }, JWT_SECRET, {
      expiresIn: (TOKEN_EXPIRES ? Number(TOKEN_EXPIRES) : '1d') as jwt.SignOptions['expiresIn']
    })

    const refreshToken = remember
      ? jwt.sign({ id: user.id, username: user.username, type: 'refresh' }, JWT_SECRET, {
          expiresIn: (TOKEN_REFRESH_EXPIRES ? Number(TOKEN_REFRESH_EXPIRES) : '30d') as jwt.SignOptions['expiresIn']
        })
      : null

    return JsonResponse({
      data: {
        id: user.id,
        name: user.name,
        roleId: user.role?.id,
        image: user.image,
        accessToken,
        refreshToken,
        remember: rememberMe
      },
      message: ['ok'],
      status: 200
    })
  } catch (error) {
    return JsonResponse({ message: ['Internal Server Error'], status: 500 })
  }
}
