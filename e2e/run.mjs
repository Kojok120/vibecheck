/**
 * End-to-end check: load the built extension into a real Chrome, drive the
 * capture flow the way a reviewer would, and assert on what actually lands in
 * storage, on disk, and in the side panel.
 *
 * Run with `pnpm e2e` after `pnpm build`.
 */
import { mkdtemp, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch, Session, waitFor, workerSession } from './harness.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const checks = []
const check = (name, ok, detail = '') => {
  checks.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

const chrome = await launch({
  extensionDir: join(here, '..', '.output', 'chrome-mv3'),
  fixtures: join(here, 'fixtures'),
  headless: !process.argv.includes('--headed'),
})

try {
  const list = await waitFor(async () => {
    const all = await chrome.targets()
    return all.some((t) => t.type === 'page') ? all : null
  }, { label: 'a page target' })

  const target =
    list.find((t) => t.type === 'page' && !t.url.startsWith('chrome-extension://')) ??
    list.find((t) => t.type === 'page')
  const page = await Session.attach(target.webSocketDebuggerUrl)
  await page.send('Page.enable')
  await page.send('Runtime.enable')

  const worker = await workerSession(chrome, page)
  await worker.send('Runtime.enable')
  check('service worker reachable', true)

  await page.send('Page.navigate', { url: chrome.pageUrl })
  await waitFor(() => page.evaluate(`document.title === 'Test app'`), { label: 'the fixture page' })
  check('fixture page loaded', true)

  const mode = () =>
    page.evaluate(
      `document.getElementById('vibecheck-overlay-root')?.getAttribute('data-vibecheck-mode') ?? null`,
    )

  const tabId = await worker.evaluate(`
    (async () => {
      const [tab] = await chrome.tabs.query({ url: '${chrome.pageUrl}' })
      await chrome.tabs.update(tab.id, { active: true })
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['/overlay.js'] })
      return tab.id
    })()
  `)
  check('overlay injected on demand', typeof tabId === 'number', `tab ${tabId}`)

  check(
    'overlay reaches its idle state',
    (await waitFor(async () => ((await mode()) === 'idle' ? 'idle' : null), {
      label: 'the HUD',
    })) === 'idle',
  )
  check(
    'page styles are untouched',
    await page.evaluate(`getComputedStyle(document.body).margin === '0px'`),
  )
  check(
    'the page cannot reach into the overlay',
    await page.evaluate(
      `document.getElementById('vibecheck-overlay-root').shadowRoot === null`,
    ),
  )

  const key = async (text, code, keyCode) => {
    for (const type of ['keyDown', 'keyUp']) {
      await page.send('Input.dispatchKeyEvent', {
        type,
        key: text,
        code,
        windowsVirtualKeyCode: keyCode,
        nativeVirtualKeyCode: keyCode,
        ...(type === 'keyDown' && text.length === 1 ? { text } : {}),
      })
    }
  }
  const mouse = (type, x, y) =>
    page.send('Input.dispatchMouseEvent', {
      type,
      x,
      y,
      button: 'left',
      buttons: type === 'mouseReleased' ? 0 : 1,
      clickCount: 1,
      pointerType: 'mouse',
    })

  await key('s', 'KeyS', 83)
  check(
    'S starts a selection',
    (await waitFor(async () => ((await mode()) === 'selecting' ? 'selecting' : null), {
      label: 'selection mode',
    })) === 'selecting',
  )

  const box = await page.evaluate(`
    (() => { const r = document.querySelector('#totals').getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } })()
  `)
  await mouse('mousePressed', box.x - 6, box.y - 6)
  await mouse('mouseMoved', box.x + box.w + 6, box.y + box.h + 6)
  await mouse('mouseReleased', box.x + box.w + 6, box.y + box.h + 6)

  check(
    'the drag captures and opens the form',
    (await waitFor(async () => ((await mode()) === 'composing' ? 'composing' : null), {
      label: 'the comment form',
      timeout: 15000,
    })) === 'composing',
  )

  const shot = await worker.evaluate(`
    (async () => {
      const db = await new Promise((res, rej) => {
        const r = indexedDB.open('vibecheck', 1)
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
      })
      const read = (fn) => new Promise((res, rej) => {
        const r = fn(db.transaction('shots').objectStore('shots'))
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
      })
      const keys = await read((s) => s.getAllKeys())
      if (!keys.length) return null
      const record = await read((s) => s.get(keys.at(-1)))
      const blob = record instanceof Blob ? record : record.blob
      const bitmap = await createImageBitmap(blob)
      return { width: bitmap.width, height: bitmap.height, at: record.at ?? null }
    })()
  `)
  check('screenshot stored in IndexedDB', Boolean(shot), shot ? `${shot.width}×${shot.height}` : '')
  check(
    'the screenshot records when it was taken',
    typeof shot?.at === 'number',
    'so the collector can spare one whose comment is still being written',
  )
  if (shot) {
    const dpr = await page.evaluate('window.devicePixelRatio')
    const expected = { w: Math.round((box.w + 12) * dpr), h: Math.round((box.h + 12) * dpr) }
    check(
      'the crop matches the dragged region',
      Math.abs(shot.width - expected.w) <= 2 && Math.abs(shot.height - expected.h) <= 2,
      `got ${shot.width}×${shot.height}, expected ~${expected.w}×${expected.h}`,
    )
  }

  // Real keystrokes: the overlay ignores synthetic events, and the form is no
  // longer reachable from the page.
  const type = (text) => page.send('Input.insertText', { text })
  await type('数値が3桁を超えると右端で見切れる')
  await key('Tab', 'Tab', 9)
  await type('桁区切りを入れて右揃えにする')
  await page.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
    modifiers: 4, // Meta
  })
  await page.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
    modifiers: 4,
  })

  const session = await waitFor(
    async () => {
      const sessions = JSON.parse(
        await worker.evaluate(
          `chrome.storage.local.get(['sessions']).then((r) => JSON.stringify(r.sessions ?? []))`,
        ),
      )
      return sessions[0]?.items?.length ? sessions[0] : null
    },
    { label: 'the stored item' },
  )
  const item = session.items.at(-1)
  check(
    'both fields saved',
    item.background.includes('3桁') && item.request.includes('桁区切り'),
  )
  check('page URL saved', item.page.url === chrome.pageUrl, item.page.url)
  check(
    'the selector resolves back to the element',
    await page.evaluate(
      `!!document.querySelector(${JSON.stringify(item.target?.selector ?? 'x')})`,
    ),
    item.target?.selector,
  )
  check(
    'the selector is anchored on a stable id',
    (item.target?.selector ?? '').startsWith('#totals'),
    item.target?.selector,
  )
  check('session grouped by origin', session.origin === new URL(chrome.pageUrl).origin, session.origin)

  await key('Escape', 'Escape', 27)
  check(
    'Esc dismisses the overlay',
    (await waitFor(async () => ((await mode()) === 'off' ? 'off' : null), {
      label: 'the overlay to close',
    })) === 'off',
  )

  // --- side panel ---------------------------------------------------------
  await page.send('Page.navigate', { url: `chrome-extension://${chrome.extensionId}/sidepanel.html` })
  await waitFor(() => page.evaluate(`document.querySelectorAll('li').length > 0`), {
    label: 'the side panel list',
  })
  const fields = JSON.parse(
    await page.evaluate(
      `JSON.stringify([...document.querySelectorAll('textarea')].map((t) => t.value))`,
    ),
  )
  check('side panel shows both fields', fields.join(' ').includes('桁区切り'), fields.join(' / '))
  check(
    'side panel shows the screenshot',
    await page.evaluate(`!!document.querySelector('li img[src^="blob:"]')`),
  )

  // --- save writes a usable bundle ----------------------------------------
  const downloads = await mkdtemp(join(tmpdir(), 'vibecheck-downloads-'))
  await chrome.setDownloadPath(downloads)
  await page.evaluate(`
    (() => {
      [...document.querySelectorAll('button')].find((b) => b.textContent === 'Save').click()
      return true
    })()
  `)
  const status = await waitFor(
    async () => {
      const text = await page.evaluate('document.body.innerText')
      return /Saved to|rror/.test(text) ? text : null
    },
    { label: 'the save to finish', timeout: 25000 },
  )
  const line = status.split('\n').find((l) => /Saved to|rror/.test(l)) ?? ''
  check('Save reports success', /Saved to vibecheck/.test(line), line)

  // Handled items must leave the open list, or the panel stops being a to-do list.
  const cleared = await waitFor(
    async () => {
      const sessions = JSON.parse(
        await worker.evaluate(
          `chrome.storage.local.get(['sessions']).then((r) => JSON.stringify(r.sessions ?? []))`,
        ),
      )
      const saved = sessions[0]?.items?.at(-1)
      return saved?.done ? saved : null
    },
    { label: 'the item to be marked done' },
  )
  check('Save clears the item off the open list', cleared.done.via === 'save', cleared.done.via)
  check('a handled item is unticked', cleared.checked === false)
  check(
    'the panel folds it into the done section',
    await waitFor(
      () =>
        page.evaluate(
          `(() => { const s = document.querySelector('details summary')
             return s && /Done \\(1\\)|対応済み \\(1\\)/.test(s.textContent) })()`,
        ),
      { label: 'the done section' },
    ),
  )
  check(
    'reopening puts it back',
    await (async () => {
      await page.evaluate(`
        (() => { const d = document.querySelector('details'); d.open = true
          const b = [...d.querySelectorAll('button')].find((x) => /Reopen|戻す/.test(x.textContent))
          b.click(); return true })()
      `)
      return waitFor(() => page.evaluate(`document.querySelectorAll('li input[type=checkbox]').length > 0`), {
        label: 'the item to come back',
      })
    })(),
  )

  // Under `Browser.setDownloadBehavior` Chrome flattens names to GUIDs, so the
  // real `vibecheck/<session>/01-<slug>.png` layout is not what lands here.
  const files = await readdir(downloads, { recursive: true })
  const markdownName = files.find((f) => f.endsWith('.md'))
  const markdown = markdownName ? await readFile(join(downloads, markdownName), 'utf8') : ''
  check('review.md written', Boolean(markdownName))
  check('review.md carries both fields', markdown.includes('3桁') && markdown.includes('桁区切り'))
  check(
    'review.md links the screenshot by absolute path',
    /!\[#1\]\(\/.*\.png\)/.test(markdown),
    markdown.match(/!\[#1\]\([^)]*\)/)?.[0] ?? '(no image link)',
  )
  check('review.md records the selector', markdown.includes('#totals'))

  page.close()
  worker.close()
} finally {
  await chrome.close()
}

const failed = checks.filter((c) => !c.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
process.exit(failed.length ? 1 : 0)
