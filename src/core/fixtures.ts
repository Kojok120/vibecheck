import type { FeedbackItem, NumberedItem } from '@/types'

/** Test/preview fixture builder. Keeps specs readable by defaulting everything. */
export function makeItem(overrides: Partial<FeedbackItem> = {}): FeedbackItem {
  return {
    id: 'item-1',
    createdAt: new Date(2026, 8, 1, 10, 0).getTime(),
    kind: 'shot',
    background: 'Numbers are clipped on narrow screens.',
    request: 'Right-align and add thousands separators.',
    page: {
      url: 'https://app.example.com/dashboard',
      title: 'Dashboard',
      viewportWidth: 1280,
      viewportHeight: 800,
      dpr: 2,
      scrollY: 0,
    },
    target: {
      selector: '#totals > .amount',
      tag: 'span',
      text: '1234567',
      rect: { x: 100, y: 200, width: 320, height: 60 },
    },
    shotKey: 'shot-1',
    shotWidth: 640,
    shotHeight: 120,
    checked: true,
    ...overrides,
  }
}

/** Number a list of items the way the side panel does. */
export function numbered(items: FeedbackItem[]): NumberedItem[] {
  return items.map((item, index) => ({ item, seq: index + 1 }))
}
