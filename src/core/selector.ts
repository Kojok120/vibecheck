import { truncate } from './naming'

/**
 * Turn the element under a selection into a CSS selector an agent can grep for.
 * Prefers stable hooks (id, test ids) and only falls back to structural paths.
 */

const TEST_ID_ATTRIBUTES = ['data-testid', 'data-test-id', 'data-test', 'data-qa', 'data-cy']
const MAX_DEPTH = 6
/**
 * Framework-generated class names are noise, not a hook. What marks one is a
 * digit-bearing hash segment (`Button_root__1a2b3`, `_1q2w3e`) or a css-in-js
 * prefix — not length, which would throw away `toolbar` and `header` too.
 * Utility classes like `px-4` fall out here as well, which is right: they
 * describe styling, not identity.
 */
const GENERATED_CLASS =
  /^(?:css|sc|jsx|emotion|styled)-|(?:^|[-_])[A-Za-z0-9]*\d[A-Za-z0-9]*$/

function escapeIdent(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
  return value.replace(/([^\w-])/g, '\\$1')
}

function isUnique(root: Document | ShadowRoot, selector: string): boolean {
  try {
    return root.querySelectorAll(selector).length === 1
  } catch {
    return false
  }
}

function testIdSelector(el: Element): string | null {
  for (const attribute of TEST_ID_ATTRIBUTES) {
    const value = el.getAttribute(attribute)
    if (value) return `[${attribute}="${value.replace(/"/g, '\\"')}"]`
  }
  return null
}

function stableClass(el: Element): string | null {
  const classes = Array.from(el.classList).filter(
    (name) => name.length > 1 && name.length < 32 && !GENERATED_CLASS.test(name),
  )
  return classes[0] ? `.${escapeIdent(classes[0])}` : null
}

function nthOfType(el: Element): number {
  let index = 1
  let sibling = el.previousElementSibling
  while (sibling) {
    if (sibling.tagName === el.tagName) index += 1
    sibling = sibling.previousElementSibling
  }
  return index
}

function segmentFor(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const parent = el.parentElement
  if (!parent) return tag

  const cls = stableClass(el)
  if (cls) {
    const candidate = `${tag}${cls}`
    const sameCount = Array.from(parent.children).filter((child) =>
      child.matches(candidate),
    ).length
    if (sameCount === 1) return candidate
  }

  const sameTag = Array.from(parent.children).filter((c) => c.tagName === el.tagName)
  return sameTag.length > 1 ? `${tag}:nth-of-type(${nthOfType(el)})` : tag
}

/**
 * Build a selector for `el`.
 *
 * An anchor — a unique id or test id on the element or a nearby ancestor —
 * wins over a shorter structural path, because `#totals > div:nth-of-type(2)`
 * tells a reader (or an agent reading the report) far more about where the
 * element lives than a bare `div:nth-of-type(2)`, and survives edits better.
 * Without an anchor, the shortest path that resolves uniquely is used.
 */
export function buildSelector(el: Element | null): string {
  if (!el) return ''
  const root = el.getRootNode() as Document | ShadowRoot

  const parts: string[] = []
  let shortestUnique: string | undefined
  let current: Element | null = el

  for (let depth = 0; current && depth < MAX_DEPTH; depth += 1) {
    const id = current.getAttribute('id')
    if (id && isUnique(root, `#${escapeIdent(id)}`)) {
      parts.unshift(`#${escapeIdent(id)}`)
      return parts.join(' > ')
    }

    const testId = testIdSelector(current)
    if (testId && isUnique(root, testId)) {
      parts.unshift(testId)
      return parts.join(' > ')
    }

    parts.unshift(segmentFor(current))
    const candidate = parts.join(' > ')
    shortestUnique ??= isUnique(root, candidate) ? candidate : undefined

    const parent: Element | null = current.parentElement
    if (!parent || parent.tagName === 'HTML') break
    current = parent
  }

  return shortestUnique ?? parts.join(' > ')
}

/** A short excerpt of the element's own text, for context in the report. */
export function elementText(el: Element | null, maxLength = 120): string | undefined {
  const text = el?.textContent?.replace(/\s+/g, ' ').trim()
  return text ? truncate(text, maxLength) : undefined
}
