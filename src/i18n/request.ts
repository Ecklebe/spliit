import deepmerge from 'deepmerge'
import { getRequestConfig } from 'next-intl/server'
import { getUserLocale } from '../lib/locale'

export const localeLabels = {
  id: 'Bahasa Indonesia',
  ca: 'Català',
  'cs-CZ': 'Česky',
  'de-DE': 'Deutsch',
  'en-US': 'English',
  es: 'Español',
  eu: 'Euskera',
  'fr-FR': 'Français',
  'it-IT': 'Italiano',
  'nl-NL': 'Nederlands',
  'pl-PL': 'Polski',
  pt: 'Português',
  'pt-BR': 'Português Brasileiro',
  ro: 'Română',
  fi: 'Suomi',
  'tr-TR': 'Türkçe',
  'ru-RU': 'Русский',
  'uk-UA': 'Українська',
  he: 'עברית',
  ar: 'العربية',
  ko: '한국어',
  'ja-JP': '日本語',
  'zh-CN': '简体中文',
  'zh-TW': '正體中文',
} as const

export const locales: (keyof typeof localeLabels)[] = Object.keys(
  localeLabels,
) as any
export type Locale = keyof typeof localeLabels
export type Locales = ReadonlyArray<Locale>
export const defaultLocale: Locale = 'en-US'

/**
 * Strings for this fork's own features (expense comments, locations, file
 * import, group sync, admin) live in messages/fork/ rather than in the shared
 * catalogues, which are left byte-identical to upstream. That keeps upstream's
 * frequent Weblate merges from ever touching us, and keeps our keys out of
 * their translation workflow. Layered here in the same order as the base
 * catalogues, so a fork locale falls back to fork en-US the same way.
 */
async function loadForkMessages(locale: string) {
  try {
    return (await import(`../../messages/fork/${locale}.json`)).default
  } catch {
    // No overlay for this locale yet - Weblate has not been pointed at
    // messages/fork/, so most locales legitimately have none.
    return {}
  }
}

export default getRequestConfig(async () => {
  const locale = await getUserLocale()
  const localeMessages = (await import(`../../messages/${locale}.json`)).default

  let messages: any
  if (locale === defaultLocale) {
    messages = localeMessages
  } else {
    messages = deepmerge(
      (await import(`../../messages/${defaultLocale}.json`)).default,
      localeMessages,
    ) as any
  }

  const forkDefault = await loadForkMessages(defaultLocale)
  const forkLocale =
    locale === defaultLocale ? forkDefault : await loadForkMessages(locale)
  messages = deepmerge(
    messages,
    deepmerge(forkDefault, forkLocale) as any,
  ) as any

  return {
    locale,
    messages,
  }
})
