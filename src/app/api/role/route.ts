// Next Imports
import type { NextRequest } from 'next/server'

import { getToken } from 'next-auth/jwt'

import { prisma } from '@/libs/prisma'
import { MiddlewareApi } from '../middleware'
import { JsonResponse } from '@/libs/Response'

const getData = async (id?: string | null) => {
  if (id) {
    return await prisma.role.findFirst({
      orderBy: { name: 'asc' as const },
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        view: true,
        permission: true,
        users: {
          where: { deletedAt: null },
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    })
  }

  return await prisma.role.findMany({
    orderBy: { name: 'asc' as const },
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      view: true,
      permission: true,
      users: {
        where: { deletedAt: null },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  })
}

export async function GET(req: NextRequest) {
  const res = await MiddlewareApi(req, async request => {
    const id = request.query.get('id')

    const role = await getData(id)

    return {
      message: 'Success',
      status: 200,
      data: role
    }
  })

  return JsonResponse(res)
}

export async function POST(req: NextRequest) {
  const res = await MiddlewareApi(req, async request => {
    const { name, permission, view } = request

    const cekDuplicate = await prisma.role.findFirst({
      where: { name }
    })

    if (cekDuplicate) {
      if (cekDuplicate.name == name) {
        return {
          message: 'Name has been used',
          status: 401
        }
      } else {
        return {
          message: 'Name have been used',
          status: 401
        }
      }
    } else {
      const role = await prisma.role.create({
        data: { name, permission, view }
      })

      if (role) {
        return {
          message: 'Success Updated',
          status: 200,
          data: await getData()
        }
      } else {
        return {
          message: 'Database Error',
          status: 500
        }
      }
    }
  })

  return JsonResponse(res)
}

export async function PATCH(req: NextRequest) {
  const res = await MiddlewareApi(req, async request => {
    const { name, permission, id, view } = request

    const cekData = await prisma.role.findFirst({
      where: { id }
    })

    if (cekData) {
      const arrayCek = []

      if (cekData.name != name) {
        arrayCek.push({ name })
      }

      const cekDuplicate = await prisma.role.findFirst({
        where: { OR: arrayCek }
      })

      if (cekDuplicate) {
        if (cekDuplicate.name == name) {
          return {
            message: 'Name has been used',
            status: 401
          }
        }
      } else {
        const role = await prisma.role.update({
          where: { id },
          data: { name, permission, view }
        })

        if (role) {
          return {
            message: 'Success Updated',
            status: 200,
            data: await getData()
          }
        } else {
          return {
            message: 'Database Error',
            status: 500
          }
        }
      }
    } else {
      return {
        message: 'Role not found',
        status: 400
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

    const role = await prisma.role.findFirst({
      where: { id },
      include: {
        users: {
          where: { deletedAt: null },
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    })

    if (role) {
      if (role.id != 'clxctojzb0000bhly4wy_role') {
        if (!role.users.length) {
          const deleteRole = await prisma.role.update({
            where: { id },
            data: {
              deletedAt: new Date(),
              deletedBy: token.id ?? null
            }
          })

          if (deleteRole) {
            return {
              message: 'Success Deleted',
              status: 200,
              data: await getData()
            }
          } else {
            return {
              message: 'Database Error',
              status: 500
            }
          }
        } else {
          return {
            message: 'This role cannot be deleted, used by several users',
            status: 401,
            statusText: 'Cannot be deleted'
          }
        }
      } else {
        return {
          message: 'This role cannot be deleted',
          status: 400
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
