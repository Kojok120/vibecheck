/** Measure the rendered width of a string, in the same units as `maxWidth`. */
export type Measure = (text: string) => number

// Whitespace-delimited runs stay together; anything longer than a line (a long
// URL, or Japanese, which has no spaces at all) falls back to breaking by
// character.
const TOKENS = /\S+\s*|\s+/g

function breakLongToken(token: string, maxWidth: number, measure: Measure): string[] {
  const lines: string[] = []
  let current = ''
  // Trailing spaces can push a token past the limit on their own, which would
  // otherwise break the line and leave a blank one behind.
  for (const char of token.trimEnd()) {
    if (current && measure(current + char) > maxWidth) {
      lines.push(current)
      current = char.trim() ? char : ''
    } else {
      current += char
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Greedy word wrap that honours explicit newlines. */
export function wrapLines(text: string, maxWidth: number, measure: Measure): string[] {
  if (maxWidth <= 0) return [text]
  const out: string[] = []

  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) {
      out.push('')
      continue
    }

    let line = ''
    for (const token of paragraph.match(TOKENS) ?? []) {
      if (!line) {
        if (measure(token.trimEnd()) > maxWidth) {
          const pieces = breakLongToken(token, maxWidth, measure)
          out.push(...pieces.slice(0, -1).map((p) => p.trimEnd()))
          line = pieces.at(-1) ?? ''
        } else {
          line = token
        }
        continue
      }

      if (measure(line + token) <= maxWidth) {
        line += token
        continue
      }

      out.push(line.trimEnd())
      if (measure(token.trimEnd()) > maxWidth) {
        const pieces = breakLongToken(token, maxWidth, measure)
        out.push(...pieces.slice(0, -1).map((p) => p.trimEnd()))
        line = pieces.at(-1) ?? ''
      } else {
        line = token.trimStart()
      }
    }

    out.push(line.trimEnd())
  }

  return out
}
