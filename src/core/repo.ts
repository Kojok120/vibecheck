export interface RepoRef {
  owner: string
  repo: string
}

const NAME = '[A-Za-z0-9._-]+'
const PATTERNS = [
  new RegExp(`^(?:https?://)?(?:www\\.)?github\\.com/(${NAME})/(${NAME})`),
  new RegExp(`^git@github\\.com:(${NAME})/(${NAME})`),
  new RegExp(`^(${NAME})/(${NAME})$`),
]

/** Accept the three shapes people actually paste: slug, https URL, or SSH remote. */
export function parseRepo(input: string): RepoRef | null {
  const trimmed = input.trim().replace(/\.git$/, '').replace(/\/+$/, '')
  if (!trimmed) return null
  for (const pattern of PATTERNS) {
    const match = pattern.exec(trimmed)
    if (match?.[1] && match[2]) return { owner: match[1], repo: match[2] }
  }
  return null
}

export function formatRepo(ref: RepoRef): string {
  return `${ref.owner}/${ref.repo}`
}
