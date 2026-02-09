export const i18n = {
  defaultLocale: 'en',
  locales: ['id', 'en'],
  langDirection: {
    en: 'ltr',
    in: 'ltr'
  }
} as const

export type Locale = (typeof i18n)['locales'][number]
