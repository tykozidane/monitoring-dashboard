import bcryptjs from 'bcryptjs'

import { prisma } from '@/libs/prisma'
import { View } from '@/prisma/generated/client'

async function main() {
  try {
    const roleData = [
      {
        id: 'clxctojzb0000bhly4wy_role',
        name: 'ADMIN',
        view: View.all,
        permission: [
          { href: '/dashboards', icon: 'ri-home-smile-line', label: 'Dashboard', action: ['read', 'write', 'create'] },
          {
            label: 'Administrator',
            children: [
              { href: '/users', icon: 'ri-user-line', label: 'Pengguna', action: ['read', 'write', 'create'] },
              { href: '/roles', icon: 'ri-lock-2-line', label: 'Peran', action: ['read', 'write', 'create'] }
            ],
            isSection: true
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    const userData = [
      {
        id: 'clxctojzb0000bhly4w_admin',
        name: 'superadmin',
        username: 'superadmin',
        password: bcryptjs.hashSync('superadmin', 9),
        image: '/images/avatars/1.png',
        roleId: 'clxctojzb0000bhly4wy_role'
      }
    ]

    for (const role of roleData) {
      await prisma.role.upsert({
        where: { id: role.id },
        update: { ...role },
        create: { ...role }
      })
    }

    for (const user of userData) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: { ...user },
        create: { ...user }
      })
    }

    console.log('Seeding completed successfully!')
  } catch (error) {
    console.error('Error during seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('Done!')
  })
  .catch(e => {
    console.error('Error in seeding:', e)
    process.exit(1)
  })
