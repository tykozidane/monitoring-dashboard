import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/auth'
import DashboardComponent from '@views/dashboard'
import { prisma } from '@/libs/prisma'
import { defaultUserProps } from '@/libs/prisma-selects'


const getData = async () => {
  const session = await getServerSession(authOptions)

  const userbyId = await prisma.user.findFirst({
    where: {
      AND: [{ id: session?.user.id }, { deletedAt: null }]
    },
    select: defaultUserProps
  })

  return {
    user: userbyId
  }
}

const Dashboard = async () => {
  const getDatas = await getData()

  return (
    <DashboardComponent user={getDatas.user} mapboxAccessToken={process.env.MAPBOX_ACCESS_TOKEN!} />
  )
}

export default Dashboard
