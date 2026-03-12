// Component Imports
import { getServerSession } from 'next-auth'

import { prisma } from '@/libs/prisma'
import { defaultUserProps } from '@/libs/prisma-selects'
import { findActionsByPathname } from '@/utils/helpers'
import List from '@/views/apps'
import { authOptions } from '@/libs/auth'

const getData = async () => {
  const session = await getServerSession(authOptions)

  const userbyId = await prisma.user.findFirst({
    where: {
      AND: [{ id: session?.user.id }, { deletedAt: null }]
    },
    select: defaultUserProps
  })

  return {
    permission: findActionsByPathname(userbyId?.role?.permission as unknown as NavigationItem[] ?? [], '/apps') ?? []
  }
}

const ListApps = async () => {
  const data = await getData()

  return <List permission={data.permission} />
}

export default ListApps
