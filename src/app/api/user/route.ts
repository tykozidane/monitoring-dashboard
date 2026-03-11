// Next Imports
import type { NextRequest } from 'next/server'

import bcryptjs from 'bcryptjs'

import { getToken } from 'next-auth/jwt'

import { prisma } from '@/libs/prisma'

const dirUpload = './public/uploads/users'

// Middleware
import { MiddlewareApi, FileHandle } from '../middleware'
import { JsonResponse } from '@/libs/Response'

import { defaultRoleProps, defaultUserProps } from '@/libs/prisma-selects'

const getData = async (
  role?: boolean,
  getById?: { id: string },
  all?: boolean,
  options?: { search: string; page: number; limit: number }
) => {
  if (role) {
    return await prisma.role.findMany({
      orderBy: { name: 'asc' as const },
      where: { deletedAt: null },
      select: defaultRoleProps
    })
  } else {
    if (getById) {
      return await prisma.user.findFirst({
        where: { AND: [getById, { deletedAt: null }] },
        select: defaultUserProps,
        orderBy: [{ createdAt: 'desc' as const }]
      })
    } else {
      // Logika Server-Side Pagination & Search
      const whereClause: any = {
        deletedAt: null
      }

      if (options?.search) {
        whereClause.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { username: { contains: options.search, mode: 'insensitive' } }
        ]
      }

      const skip = options ? (options.page - 1) * options.limit : undefined
      const take = options ? options.limit : undefined

      const [data, total] = await prisma.$transaction([
        prisma.user.findMany({
          where: whereClause,
          select: defaultUserProps,
          orderBy: [{ createdAt: 'desc' as const }],
          skip,
          take
        }),
        prisma.user.count({ where: whereClause })
      ])

      return { data, total }
    }
  }
}

export async function GET(req: NextRequest) {
  const res = await MiddlewareApi(req, async request => {
    const id = request.query.get('id')
    const all = request.query.get('all')

    // Tangkap parameter pagination dan search
    const page = parseInt(request.query.get('page') || '1')
    const limit = parseInt(request.query.get('limit') || '10')
    const search = request.query.get('search') || ''

    if (id) {
      const user = await getData(false, { id: id })

      return { message: 'Success', status: 200, data: user }
    }

    const result = await getData(false, undefined, all ? true : false, { search, page, limit })

    return {
      message: 'Success',
      status: 200,
      data: result
    }
  })

  return JsonResponse(res)
}

export async function POST(req: NextRequest) {
  const res = await MiddlewareApi(req, async request => {
    const { name, username, password, contact, email, status, roleId, image } = request

    const cekDuplicate = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }, { contact }], AND: { deletedAt: null } }
    })

    if (cekDuplicate) {
      if (cekDuplicate.username == username) {
        return {
          message: 'Username has been used',
          status: 400
        }
      } else {
        return {
          message: 'Username, Password & Contact have been used',
          status: 400
        }
      }
    } else {
      const pathFile = await FileHandle({ file: image, dir: dirUpload, name })

      if (pathFile?.error) {
        return {
          message: pathFile?.error,
          status: 400
        }
      } else {
        const userData: {
          name: string
          username: string
          password: string
          email: string
          roleId: string
          image?: string
        } = {
          name,
          username,
          password: bcryptjs.hashSync(password, 9),
          email,
          roleId,
          image: pathFile?.path
        }

        const user = await prisma.user.create({
          data: userData
        })

        if (user) {
          return {
            message: 'Success Created',
            status: 200,
            data: { data: await getData(), role: await getData(true) }
          }
        } else {
          return {
            message: 'Database Error',
            status: 500
          }
        }
      }
    }
  })

  return JsonResponse(res)
}

export async function DELETE(req: NextRequest) {
  const res = await MiddlewareApi(req, async request => {
    const { id } = request
    const token = await getToken({ req })

    if (!token) {
      return {
        message: 'Token not found',
        status: 400
      }
    }

    const user = await prisma.user.findFirst({
      where: { id }
    })

    if (user) {
      if (user.id != 'clxctojzb0000bhly4w_admin') {
        const deleteUser = await prisma.$transaction([
          prisma.user.update({
            where: { id },
            data: {
              deletedAt: new Date(),
              deletedBy: token.id ?? null
            }
          })
        ])

        if (deleteUser) {
          await FileHandle({ deleteFile: user.image })

          return {
            message: 'Success Deleted',
            status: 200,
            data: { data: await getData(), role: await getData(true) }
          }
        } else {
          return {
            message: 'Database Error',
            status: 500
          }
        }
      } else {
        return {
          message: 'This user cannot be deleted',
          status: 401
        }
      }
    } else {
      return {
        message: 'Data not found',
        status: 400
      }
    }
  })

  return JsonResponse(res)
}

export async function PATCH(req: NextRequest) {
  const res = await MiddlewareApi(req, async request => {
    const {
      id,
      name,
      username,
      password,
      contact,
      email,
      status,
      roleId,
      emailVerified,
      changePassword,
      newPassword,
      companyActiveId,
      image,
      image_del
    } = request

    if (!id) {
      return {
        message: 'User not found',
        status: 400
      }
    }

    const cekUser = await prisma.user.findFirst({
      where: { id }
    })

    if (cekUser) {
      if (newPassword) {
        if (bcryptjs.compareSync(password ?? '', cekUser?.password ?? '') || !cekUser?.password) {
          const user = await prisma.user.update({
            where: { id },
            data: { password: bcryptjs.hashSync(newPassword, 9) }
          })

          if (user) {
            return {
              message: 'Success Updated',
              status: 200,
              data: user
            }
          } else {
            return {
              message: 'Database Error',
              status: 500
            }
          }
        } else {
          return {
            message: 'Password Wrong',
            status: 401
          }
        }
      } else if (changePassword) {
        const user = await prisma.user.update({
          where: { id },
          data: { password: bcryptjs.hashSync(password, 9) }
        })

        if (user) {
          return {
            message: 'Success Updated',
            status: 200
          }
        } else {
          return {
            message: 'Database Error',
            status: 500
          }
        }
      } else {
        const arrayCek = []

        if (cekUser.username != username) {
          arrayCek.push({ username })
        }

        const cekDuplicate = await prisma.user.findFirst({
          where: { OR: arrayCek }
        })

        if (cekDuplicate) {
          if (cekDuplicate.username == username) {
            return {
              message: 'Username has been used',
              status: 401
            }
          } else {
            return {
              message: 'Username, Password & Contact have been used',
              status: 401
            }
          }
        } else {
          let postData: {
            name: string
            username: string
            password: string
            roleId: string
            image?: string | null
          } = {
            name,
            username,
            password,
            roleId
          }

          if (image) {
            const path = await FileHandle({ file: image, dir: dirUpload, name: username, deleteFile: cekUser.image })

            if (path?.error) {
              return {
                message: path?.error,
                status: 400
              }
            } else {
              postData = { ...postData, image: path?.path }
            }
          } else if (image_del) {
            await FileHandle({ deleteFile: cekUser.image })
            postData = { ...postData, image: null }
          }

          const user = await prisma.user.update({
            where: { id },
            data: postData
          })

          if (user) {
            return {
              message: 'Success Updated',
              status: 200,
              data: { data: await getData(), role: await getData(true) }
            }
          } else {
            return {
              message: 'Database Error',
              status: 500
            }
          }
        }
      }
    } else {
      return {
        message: 'User not found',
        status: 400
      }
    }
  })

  return JsonResponse(res)
}
