import { describe, expect, it } from 'vitest'
import { formatRepo, parseRepo } from './repo'

describe('parseRepo', () => {
  it.each([
    ['Kojok120/vibecheck'],
    ['https://github.com/Kojok120/vibecheck'],
    ['https://github.com/Kojok120/vibecheck.git'],
    ['https://github.com/Kojok120/vibecheck/issues/1'],
    ['github.com/Kojok120/vibecheck'],
    ['git@github.com:Kojok120/vibecheck.git'],
    ['  Kojok120/vibecheck  '],
  ])('parses %s', (input) => {
    expect(parseRepo(input)).toEqual({ owner: 'Kojok120', repo: 'vibecheck' })
  })

  it.each([[''], ['vibecheck'], ['https://gitlab.com/a/b'], ['not a repo at all']])(
    'rejects %s',
    (input) => {
      expect(parseRepo(input)).toBeNull()
    },
  )
})

describe('formatRepo', () => {
  it('renders the owner/repo slug', () => {
    expect(formatRepo({ owner: 'a', repo: 'b' })).toBe('a/b')
  })
})
