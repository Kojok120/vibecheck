import { describe, expect, it } from 'vitest'
import { resolveLocale, stringsFor } from './i18n'

describe('resolveLocale', () => {
  it('honours an explicit choice', () => {
    expect(resolveLocale('en', 'ja-JP')).toBe('en')
    expect(resolveLocale('ja', 'en-US')).toBe('ja')
  })

  it('follows the browser UI language when set to auto', () => {
    expect(resolveLocale('auto', 'ja')).toBe('ja')
    expect(resolveLocale('auto', 'ja-JP')).toBe('ja')
    expect(resolveLocale('auto', 'en-GB')).toBe('en')
  })

  it('falls back to English for unknown languages', () => {
    expect(resolveLocale('auto', 'de-DE')).toBe('en')
  })
})

describe('stringsFor', () => {
  it('exposes the same keys in both locales', () => {
    expect(Object.keys(stringsFor('ja')).sort()).toEqual(Object.keys(stringsFor('en')).sort())
  })
})
