/**
 * A dependency-free harness for driving a real Chrome with the built
 * extension loaded: a static server for the fixture page, a Chrome launcher,
 * and just enough of the DevTools protocol to click around.
 *
 * Node 22 gives us `fetch` and `WebSocket`, so this needs no packages.
 */
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { cp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME_CANDIDATES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)

export async function waitFor(fn, { timeout = 20000, interval = 200, label = 'condition' } = {}) {
  const deadline = Date.now() + timeout
  let last
  while (Date.now() < deadline) {
    try {
      last = await fn()
      if (last) return last
    } catch (error) {
      last = error
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
  throw new Error(`Timed out waiting for ${label}: ${last}`)
}

export class Session {
  events = []
  #ws
  #id = 0
  #pending = new Map()

  static async attach(wsUrl) {
    const session = new Session()
    session.#ws = new WebSocket(wsUrl)
    await new Promise((resolve, reject) => {
      session.#ws.addEventListener('open', resolve, { once: true })
      session.#ws.addEventListener('error', reject, { once: true })
    })
    session.#ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.method) session.events.push(message)
      const entry = session.#pending.get(message.id)
      if (!entry) return
      session.#pending.delete(message.id)
      message.error
        ? entry.reject(new Error(JSON.stringify(message.error)))
        : entry.resolve(message.result)
    })
    return session
  }

  send(method, params = {}) {
    const id = ++this.#id
    this.#ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.#pending.set(id, { resolve, reject }))
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    })
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? 'evaluate failed')
    }
    return result.result.value
  }

  close() {
    this.#ws.close()
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.on('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

function serve(root) {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }
  const server = createServer(async (req, res) => {
    const name = (req.url ?? '/').split('?')[0].replace(/^\/+/, '') || 'page.html'
    try {
      const body = await readFile(join(root, name))
      res.writeHead(200, { 'content-type': types[name.slice(name.lastIndexOf('.'))] ?? 'text/plain' })
      res.end(body)
    } catch {
      res.writeHead(404).end('not found')
    }
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

/**
 * The shipped manifest relies on `activeTab`, which only a real keyboard
 * command can grant. A headless harness has no such gesture, so the copy it
 * loads is widened — everything else about the build is untouched.
 */
async function stageExtension(source, dir) {
  const target = join(dir, 'ext')
  await cp(source, target, { recursive: true })
  const manifestPath = join(target, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  manifest.host_permissions = [...(manifest.host_permissions ?? []), '<all_urls>']
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
  return target
}

async function findChrome() {
  const { statSync } = await import('node:fs')
  for (const candidate of CHROME_CANDIDATES) {
    try {
      if (statSync(candidate).isFile()) return candidate
    } catch {
      // Not there; try the next one.
    }
  }
  throw new Error(
    `Could not find Chrome. Set CHROME to its path. Tried:\n  ${CHROME_CANDIDATES.join('\n  ')}`,
  )
}

export async function launch({ extensionDir, fixtures, headless = true }) {
  const chrome = await findChrome()
  const dir = await mkdtemp(join(tmpdir(), 'vibecheck-e2e-'))
  const ext = await stageExtension(extensionDir, dir)
  const { server, port } = await serve(fixtures)
  // Port 0 lets the OS choose; Chrome writes the real one to DevToolsActivePort.
  const debugPort = await freePort()

  const child = spawn(
    chrome,
    [
      ...(headless ? ['--headless=new', '--disable-gpu'] : []),
      `--user-data-dir=${join(dir, 'profile')}`,
      // Required for CDP's Extensions domain, which is the only way to load an
      // unpacked extension in current Chrome.
      '--enable-unsafe-extension-debugging',
      `--remote-debugging-port=${debugPort}`,
      '--no-first-run',
      '--no-default-browser-check',
      // The checks match on English UI strings.
      '--lang=en-US',
      '--disable-background-timer-throttling',
      // CI containers often cannot set up the sandbox.
      ...(process.env.CI ? ['--no-sandbox'] : []),
      '--window-size=1180,760',
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  const base = `http://127.0.0.1:${debugPort}`
  const version = await waitFor(
    async () => (await fetch(`${base}/json/version`)).json(),
    { label: 'Chrome to accept DevTools connections' },
  )

  const browser = await Session.attach(version.webSocketDebuggerUrl)
  const { id: extensionId } = await browser.send('Extensions.loadUnpacked', { path: ext })

  const targets = async () => (await fetch(`${base}/json/list`)).json()

  return {
    extensionId,
    pageUrl: `http://127.0.0.1:${port}/page.html`,
    browser,
    targets,
    setDownloadPath: (downloadPath) =>
      browser.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath }),
    async close() {
      browser.close()
      child.kill()
      server.close()
      await rm(dir, { recursive: true, force: true }).catch(() => undefined)
    },
  }
}

/** MV3 workers idle out; a message from an extension page wakes one. */
export async function workerSession({ targets, extensionId }, pageSession) {
  const find = async () => (await targets()).find((t) => t.url.includes('/background.js'))
  let target = await find()
  if (!target) {
    await pageSession.send('Page.navigate', { url: `chrome-extension://${extensionId}/options.html` })
    await waitFor(() => pageSession.evaluate(`location.protocol === 'chrome-extension:'`), {
      label: 'an extension page',
    })
    await pageSession.evaluate(
      `chrome.runtime.sendMessage({ type: 'open-panel' }).then(() => 'ok', () => 'ok')`,
    )
    target = await waitFor(find, { label: 'the service worker' })
  }
  return Session.attach(target.webSocketDebuggerUrl)
}
