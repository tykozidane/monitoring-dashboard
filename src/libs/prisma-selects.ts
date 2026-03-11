import type { UserSelect, UserGetPayload, RoleGetPayload, RoleSelect } from '@/prisma/generated/models'

export const defaultUserProps = {
  id: true,
  username: true,
  name: true,
  image: true,
  role: true,
  roleId: true,
  password: true
} satisfies UserSelect

export type UserDefaultProps = UserGetPayload<{
  select: typeof defaultUserProps
}>

export const defaultRoleProps = {
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
      role: true
    }
  }
} satisfies RoleSelect

export type RoleDefaultProps = RoleGetPayload<{
  select: typeof defaultRoleProps
}>
