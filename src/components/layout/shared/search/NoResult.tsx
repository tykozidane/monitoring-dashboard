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


const NoResult = ({ searchValue, setOpen, dictionary, permission }: { searchValue: string; setOpen: (value: boolean) => void } & NavbarProps) => {
  // Hooks
  const { lang: locale } = useParams()

  const dataMenu = MenuFilterPermission(permission, dictionary)
    .flatMap(item => {
      if (item.href === '/dashboards') return [item]

      return item.children?.filter(child => child.href === '/companys' || child.href === '/library/item') ?? []
    })

  return (
    <div className='flex items-center justify-center grow flex-wrap plb-14 pli-16 overflow-y-auto overflow-x-hidden bs-full'>
      <div className='flex flex-col items-center'>
        <i className='ri-file-forbid-line text-[64px] mbe-2.5' />
        <p className='text-xl mbe-11'>{`No result for "${searchValue}"`}</p>
        <p className='mbe-[18px] text-textDisabled'>Try searching for</p>
        <ul className='flex flex-col gap-4'>
          {dataMenu.map((item, index) => (
            <li key={index} className='flex items-center'>
              <Link
                href={getLocalizedUrl(item?.href ?? '/', locale as Locale)}
                className='flex items-center gap-2 hover:text-primary focus-visible:text-primary focus-visible:outline-0'
                onClick={() => setOpen(false)}
              >
                <i className={classnames(item.icon, 'text-xl shrink-0')} />
                <p className='text-sm truncate'>{item.label}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default NoResult
