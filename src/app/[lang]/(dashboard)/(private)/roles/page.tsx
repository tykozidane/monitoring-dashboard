// Component Imports
import { getServerSession } from 'next-auth'

import Roles from '@/views/roles'

import verticalMenuData from '@/data/navigation/verticalMenuData'
import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import { findActionsByPathname } from '@/utils/helpers'

import type { Locale } from '@configs/i18n'
import { prisma } from '@/libs/prisma';
import { defaultRoleProps, defaultUserProps } from '@/libs/prisma-selects'

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
    permission: findActionsByPathname(userbyId?.role?.permission as unknown as NavigationItem[] ?? [], '/roles') ?? [],
    permissionUsers: findActionsByPathname(userbyId?.role?.permission as unknown as NavigationItem[] ?? [], '/users') ?? [],
  }
}


const RolesServer = async (props: { params: Promise<{ lang: Locale }> }) => {
  const params = await props.params;
  const data = await getData();

  const menuData = verticalMenuData(await getDictionary(params.lang))

  return <Roles permission={data.permission} permissionUsers={data.permissionUsers} menuData={menuData} roleData={data.role} />
}

export default RolesServer
