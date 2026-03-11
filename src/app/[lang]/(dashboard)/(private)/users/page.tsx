// Component Imports
import { getServerSession } from 'next-auth'

import UserList from '@/views/user'
import { authOptions } from '@/libs/auth'

import { findActionsByPathname } from '@/utils/helpers'
import { prisma } from '@/libs/prisma';
import { defaultRoleProps, defaultUserProps } from '@/libs/prisma-selects';

const getData = async () => {
  const session = await getServerSession(authOptions)

  const userbyId = await prisma.user.findFirst({
    where: {
      AND: [{ id: session?.user.id }, { deletedAt: null }]
    },
    select: defaultUserProps
  })

  const role = await prisma.role.findMany({
    orderBy: { name: 'asc' as const },
    where: { deletedAt: null },
    select: defaultRoleProps
  })

  return {
    role,
    permission: findActionsByPathname(userbyId?.role?.permission as unknown as NavigationItem[] ?? [], '/roles') ?? []
  }
}

const UserListApps = async () => {
  const data = await getData()

  return <UserList permission={data.permission} roleData={data.role} />
}

export default UserListApps
