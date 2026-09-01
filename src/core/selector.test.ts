// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { buildSelector, elementText } from './selector'

function mount(html: string): void {
  document.body.innerHTML = html
}

function find(selector: string): Element {
  const el = document.querySelector(selector)
  if (!el) throw new Error(`fixture missing: ${selector}`)
  return el
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('buildSelector', () => {
  it('prefers a unique id', () => {
    mount('<div><span id="total">1</span></div>')
    expect(buildSelector(find('#total'))).toBe('#total')
  })

  it('prefers a test id over structure', () => {
    mount('<div><b data-testid="amount">1</b></div>')
    expect(buildSelector(find('[data-testid="amount"]'))).toBe('[data-testid="amount"]')
  })

  it('anchors on an ancestor id when the structure alone is ambiguous', () => {
    mount(`
      <section id="left"><div><span>a</span></div></section>
      <section id="right"><div><span>b</span></div></section>`)
    const target = find('#right span')
    expect(buildSelector(target)).toBe('#right > div > span')
    expect(document.querySelector(buildSelector(target))).toBe(target)
  })

  it('falls back to the shortest unique path when nothing anchors it', () => {
    mount('<main><div class="toolbar"><button>Save</button></div></main>')
    expect(buildSelector(find('button'))).toBe('button')
  })

  it('prefers an id anchor over a shorter but vaguer path', () => {
    mount(`
      <section id="totals">
        <div><span>Revenue</span><span>1</span></div>
        <div><span>Orders</span><span>2</span></div>
      </section>`)
    const target = document.querySelectorAll('#totals > div')[1]!
    const selector = buildSelector(target)
    expect(selector).toBe('#totals > div:nth-of-type(2)')
    expect(document.querySelector(selector)).toBe(target)
  })

  it('disambiguates siblings with nth-of-type', () => {
    mount('<ul><li>a</li><li>b</li><li>c</li></ul>')
    const selector = buildSelector(document.querySelectorAll('li')[2]!)
    expect(selector).toContain('nth-of-type(3)')
    expect(document.querySelector(selector)?.textContent).toBe('c')
  })

  it('uses a meaningful class when it is unique among siblings', () => {
    mount('<div id="card"><p class="lead">a</p><p>b</p></div>')
    expect(buildSelector(find('.lead'))).toBe('#card > p.lead')
  })

  it.each([['css-1a2b3c4'], ['sc-bdVaJa'], ['Button_root__1a2b3'], ['px-4']])(
    'ignores the generated class name %s',
    (generated) => {
      mount(`<div id="w"><span class="${generated}">a</span><span>b</span></div>`)
      expect(buildSelector(find(`[class="${generated}"]`))).not.toContain(generated)
    },
  )

  it.each([['toolbar'], ['header'], ['amount'], ['submit-button']])(
    'keeps the meaningful class name %s',
    (meaningful) => {
      mount(`<div id="w"><span class="${meaningful}">a</span><span>b</span></div>`)
      expect(buildSelector(find(`.${meaningful}`))).toBe(`#w > span.${meaningful}`)
    },
  )

  it('ignores an id that is not unique', () => {
    mount('<div id="dup"><span>a</span></div><div id="dup"><b>b</b></div>')
    const target = find('b')
    const selector = buildSelector(target)
    expect(selector).not.toContain('#dup')
    expect(document.querySelector(selector)).toBe(target)
  })

  it('always resolves back to the element it described', () => {
    mount(`
      <main><article><header><h2>Title</h2></header>
      <div class="row"><button>One</button><button>Two</button></div>
      </article></main>`)
    const target = document.querySelectorAll('button')[1]!
    const selector = buildSelector(target)
    expect(document.querySelector(selector)).toBe(target)
  })

  it('escapes ids that are not bare identifiers', () => {
    mount('<div id="a:b"><span>x</span></div>')
    const selector = buildSelector(find('#a\\:b'))
    expect(() => document.querySelector(selector)).not.toThrow()
    expect(document.querySelector(selector)).toBe(find('#a\\:b'))
  })

  it('returns an empty string when there is no element', () => {
    expect(buildSelector(null)).toBe('')
  })
})

describe('elementText', () => {
  it('flattens and trims the text', () => {
    mount('<p>  hello\n   world </p>')
    expect(elementText(find('p'))).toBe('hello world')
  })

  it('truncates long text', () => {
    mount(`<p>${'x'.repeat(300)}</p>`)
    expect(elementText(find('p'), 20)).toHaveLength(20)
  })

  it('returns undefined for empty elements', () => {
    mount('<div></div>')
    expect(elementText(find('div'))).toBeUndefined()
    expect(elementText(null)).toBeUndefined()
  })
})
