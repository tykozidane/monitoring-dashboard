// MUI Imports
import Button from '@mui/material/Button'

// Type Imports
import { getServerSession } from 'next-auth'

import type { ChildrenType } from '@core/types'
import type { Locale } from '@configs/i18n'

// Layout Imports
import LayoutWrapper from '@layouts/LayoutWrapper'
import VerticalLayout from '@layouts/VerticalLayout'
import HorizontalLayout from '@layouts/HorizontalLayout'

// Component Imports
import Providers from '@components/Providers'
import Navigation from '@components/layout/vertical/Navigation'
import Header from '@components/layout/horizontal/Header'
import Navbar from '@components/layout/vertical/Navbar'
import VerticalFooter from '@components/layout/vertical/Footer'
import HorizontalFooter from '@components/layout/horizontal/Footer'
import Customizer from '@core/components/customizer'
import ScrollToTop from '@core/components/scroll-to-top'
import AuthGuard from '@/hocs/AuthGuard'

// Config Imports
import { i18n } from '@configs/i18n'

// Util Imports
import { getDictionary } from '@/utils/getDictionary'
import { getMode, getSystemMode } from '@core/utils/serverHelpers'
import { authOptions } from '@/libs/auth'
import { prisma } from '@/libs/prisma'
import { defaultUserProps } from '@/libs/prisma-selects'

import Permission from '@/views/Permission'


const getData = async () => {
  const session = await getServerSession(authOptions)

  const userbyId = await prisma.user.findFirstOrThrow({
    where: {
      AND: [{ id: session?.user.id }, { deletedAt: null }]
    },
    select: defaultUserProps
  })

  return {
    user: userbyId,
    permission: userbyId?.role?.permission as unknown as NavigationItem[] ?? []
  }
}


const Layout = async (props: ChildrenType & { params: Promise<{ lang: string }> }) => {
  const params = await props.params
  const { permission, user } = await getData()

  const { children } = props

  // Type guard to ensure lang is a valid Locale
  const lang: Locale = i18n.locales.includes(params.lang as Locale) ? (params.lang as Locale) : i18n.defaultLocale

  // Vars
  const direction = i18n.langDirection[lang]
  const dictionary = await getDictionary(lang)
  const mode = await getMode()
  const systemMode = await getSystemMode()

  return (
    <Providers direction={direction}>
      <AuthGuard locale={lang}>
        <Permission lang={params.lang} mode={mode} systemMode={systemMode} permission={permission} >
          <LayoutWrapper
            systemMode={systemMode}
            verticalLayout={
              <VerticalLayout
                navigation={<Navigation permission={permission} dictionary={dictionary} mode={mode} />}
                navbar={<Navbar dictionary={dictionary} permission={permission} user={user} />}
                footer={<VerticalFooter />}
              >
                {children}
              </VerticalLayout>
            }
            horizontalLayout={
              <HorizontalLayout header={<Header dictionary={dictionary} />} footer={<HorizontalFooter />}>
                {children}
              </HorizontalLayout>
            }
          />
          <ScrollToTop className='mui-fixed'>
            <Button
              variant='contained'
              className='is-10 bs-10 rounded-full p-0 min-is-0 flex items-center justify-center'
            >
              <i className='tabler-arrow-up' />
            </Button>
          </ScrollToTop>
          <Customizer dir={direction} />
        </Permission>
      </AuthGuard>
    </Providers>
  )
}

export default Layout
