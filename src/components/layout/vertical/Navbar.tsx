// Component Imports
import LayoutNavbar from '@layouts/components/vertical/Navbar'
import NavbarContent from './NavbarContent'
import type { getDictionary } from '@/utils/getDictionary'
import type { UserDefaultProps } from '@/libs/prisma-selects'

export type NavbarProps = {
  dictionary: Awaited<ReturnType<typeof getDictionary>>
  permission: NavigationItem[]
  user?: UserDefaultProps
}

const Navbar = ({ dictionary, permission, user }: NavbarProps) => {
  return (
    <LayoutNavbar>
      <NavbarContent user={user} dictionary={dictionary} permission={permission} />
    </LayoutNavbar>
  )
}

export default Navbar
