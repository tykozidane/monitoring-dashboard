// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'
import type { getDictionary } from '@/utils/getDictionary'

const verticalMenuData = (dictionary: Awaited<ReturnType<typeof getDictionary>>): VerticalMenuDataType[] => [
  // This is how you will normally render submenu
  {
    label: dictionary['navigation'].dashboards,
    icon: 'tabler-smart-home',
    children: [
      {
        label: dictionary['navigation'].monitoring,
        icon: 'tabler-chart-histogram',
        href: '/dashboards/monitoring'
      },
    ]
  },
  {
    label: dictionary['navigation'].appsAdmin,
    icon: 'tabler-adjustments',
    children: [
      {
        label: dictionary['navigation'].user,
        icon: 'tabler-users-group',
        href: '/users'
      },
      {
        label: dictionary['navigation'].roles,
        icon: 'tabler-lock',
        href: '/roles'
      },
    ]
  },
  {
    label: dictionary['navigation'].terminal,
    icon: 'tabler-layout-sidebar-right-expand',
    href: '/terminal'
  },
  {
    label: dictionary['navigation'].location,
    icon: 'tabler-map-pin',
    href: '/location'
  },
  {
    label: dictionary['navigation'].threshold,
    icon: 'tabler-alert-triangle',
    href: '/threshold'
  },
  {
    label: dictionary['navigation'].apps,
    icon: 'tabler-apps-filled',
    href: '/apps'
  },
]

export default verticalMenuData
