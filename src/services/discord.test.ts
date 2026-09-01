import { describe, expect, it } from 'vitest'
import { DISCORD_CONTENT_LIMIT, isWebhookUrl, truncateContent } from './discord'

describe('isWebhookUrl', () => {
  it('accepts a real webhook URL', () => {
    expect(isWebhookUrl('https://discord.com/api/webhooks/123456789/abcDEF-_123')).toBe(true)
  })

  it('tolerates surrounding whitespace', () => {
    expect(isWebhookUrl('  https://discord.com/api/webhooks/1/aa  ')).toBe(true)
  })

  it.each([
    ['http://discord.com/api/webhooks/1/aa'],
    ['https://discord.com/api/channels/1'],
    ['https://example.com/api/webhooks/1/aa'],
    [''],
  ])('rejects %s', (url) => {
    expect(isWebhookUrl(url)).toBe(false)
  })
})

describe('truncateContent', () => {
  it('leaves short content alone', () => {
    expect(truncateContent('hello')).toBe('hello')
  })

  it('never exceeds the Discord limit', () => {
    const out = truncateContent('x'.repeat(DISCORD_CONTENT_LIMIT + 500))
    expect(out).toHaveLength(DISCORD_CONTENT_LIMIT)
    expect(out.endsWith('…')).toBe(true)
  })
})
