// Component Imports
import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/auth'
import List from '@/views/location'
import { defaultUserProps } from '@/libs/prisma-selects'
import { findActionsByPathname } from '@/utils/helpers'
import { prisma } from '@/libs/prisma'

const getData = async () => {
  const session = await getServerSession(authOptions)

  const userbyId = await prisma.user.findFirst({
    where: {
      AND: [{ id: session?.user.id }, { deletedAt: null }]
    },
    select: defaultUserProps
  })

  return {
    permission: findActionsByPathname(userbyId?.role?.permission as unknown as NavigationItem[] ?? [], '/location') ?? []
  }
}

const ListApps = async () => {
  const data = await getData()

  return <List permission={data.permission} />
}

export default ListApps
