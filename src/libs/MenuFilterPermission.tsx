import menuData from '@/data/navigation/verticalMenuData'

import type { getDictionary } from '@/utils/getDictionary'

export const MenuFilterPermission = (permission: MenuItem[], dictionary: Awaited<ReturnType<typeof getDictionary>>) => {
  // 1️⃣ Kumpulkan semua href yang punya read permission
  const permissionSet = new Set<string>()

  const collectPermission = (menus?: MenuItem[]) => {
    if (!menus) return

    for (const menu of menus) {
      if (menu.href && menu.action?.includes('read')) {
        permissionSet.add(menu.href)
      }

      if (menu.children?.length) {
        collectPermission(menu.children)
      }
    }
  }

  collectPermission(permission)

  // 2️⃣ Filter menu berdasarkan permission (1 DFS)
  const filterMenu = (menus: MenuItem[]): MenuItem[] => {
    const result: MenuItem[] = []

    for (const menu of menus) {
      // menu dengan href
      if (menu.href) {
        if (permissionSet.has(menu.href)) {
          result.push(menu)
        }

        continue
      }

      // menu parent (tanpa href)
      if (menu.children?.length) {
        const filteredChildren = filterMenu(menu.children)

        if (filteredChildren.length > 0) {
          result.push({
            ...menu,
            children: filteredChildren
          })
        }
      }
    }

    return result
  }

  if (!permission) return []

  const menuSource: MenuItem[] = menuData(dictionary)

  return filterMenu(menuSource)
}
