// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { Locale } from '@configs/i18n'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'
import type { NavbarProps } from '../../vertical/Navbar'
import { MenuFilterPermission } from '@/libs/MenuFilterPermission'

type DefaultSuggestionsType = {
  sectionLabel: string
  items: {
    label: string
    href: string
    icon?: string
  }[]
}

export const buildDefaultSuggestions = (
  menus: MenuItem[]
): DefaultSuggestionsType[] => {
  const result: DefaultSuggestionsType[] = []
  const popularItems: DefaultSuggestionsType['items'] = []

  for (const menu of menus) {
    // 1️⃣ Menu tanpa section (langsung href)
    if (menu.href) {
      popularItems.push({
        label: menu.label,
        icon: menu.icon,
        href: menu.href
      })
      continue
    }

    // 2️⃣ Menu section
    if (menu.isSection && menu.children?.length) {
      const items = menu.children
        .filter(child => child.href)
        .map(child => ({
          label: child.label,
          icon: child.icon,
          href: child.href!
        }))

      if (items.length > 0) {
        result.push({
          sectionLabel: menu.label,
          items
        })
      }
    }
  }

  // 3️⃣ Popular Searches selalu di paling atas
  if (popularItems.length > 0) {
    result.unshift({
      sectionLabel: 'Popular Searches',
      items: popularItems
    })
  }

  return result
}


const DefaultSuggestions = ({ setOpen, dictionary, permission }: { setOpen: (value: boolean) => void } & NavbarProps) => {
  // Hooks
  const { lang: locale } = useParams()

  const dataMenu = buildDefaultSuggestions(MenuFilterPermission(permission, dictionary));

  return (
    <div className='flex grow flex-wrap gap-x-12 gap-y-8 plb-14 pli-16 overflow-y-auto overflow-x-hidden bs-full'>
      {dataMenu.map((section, index) => (
        <div
          key={index}
          className='flex flex-col justify-center overflow-x-hidden gap-4 basis-full sm:basis-[calc((100%-3rem)/2)]'
        >
          <p className='text-xs uppercase text-textDisabled tracking-[0.8px]'>{section.sectionLabel}</p>
          <ul className='flex flex-col gap-4'>
            {section.items.map((item, i) => (
              <li key={i} className='flex'>
                <Link
                  href={getLocalizedUrl(item.href, locale as Locale)}
                  className='flex items-center overflow-x-hidden cursor-pointer gap-2 hover:text-primary focus-visible:text-primary focus-visible:outline-0'
                  onClick={() => setOpen(false)}
                >
                  {item.icon && <i className={classnames(item.icon, 'flex text-xl shrink-0')} />}
                  <p className='text-[15px] truncate'>{item.label}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default DefaultSuggestions
