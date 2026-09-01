/**
 * VibeCheck's GitHub sign-in helper.
 *
 * GitHub requires a client secret to exchange an authorization code for a
 * token — PKCE does not lift that requirement — and a browser extension cannot
 * hold a secret. This worker is the smallest thing that closes the gap: it
 * holds the secret, performs the exchange, and hands the token straight back
 * to the extension. It stores nothing and logs nothing.
 */

export interface Env {
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  /** Comma-separated Chrome extension ids allowed to complete a sign-in. */
  ALLOWED_EXTENSION_IDS: string
}

const SCOPE = 'repo'
const EXTENSION_ID = /^[a-p]{32}$/

function allowed(env: Env, extensionId: string): boolean {
  if (!EXTENSION_ID.test(extensionId)) return false
  return env.ALLOWED_EXTENSION_IDS.split(',')
    .map((id) => id.trim())
    .includes(extensionId)
}

/**
 * Only ever an allow-listed extension's own callback. Redirecting anywhere
 * else would turn this into an open redirector that leaks access tokens.
 */
function extensionCallback(extensionId: string): string {
  return `https://${extensionId}.chromiumapp.org/`
}

function fail(redirect: string | null, message: string, status = 400): Response {
  if (!redirect) return new Response(message, { status })
  const url = new URL(redirect)
  url.hash = new URLSearchParams({ error: message }).toString()
  return Response.redirect(url.toString(), 302)
}

async function start(url: URL, env: Env): Promise<Response> {
  const extensionId = url.searchParams.get('ext') ?? ''
  const state = url.searchParams.get('state') ?? ''
  if (!allowed(env, extensionId)) return fail(null, 'Unknown extension', 403)
  if (!state) return fail(null, 'Missing state')

  const authorize = new URL('https://github.com/login/oauth/authorize')
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID)
  authorize.searchParams.set('redirect_uri', `${url.origin}/callback`)
  authorize.searchParams.set('scope', SCOPE)
  // The extension id travels with the state so the callback knows where to
  // return to without trusting a redirect parameter.
  authorize.searchParams.set('state', `${extensionId}.${state}`)
  return Response.redirect(authorize.toString(), 302)
}

async function callback(url: URL, env: Env): Promise<Response> {
  const code = url.searchParams.get('code')
  const [extensionId = '', ...rest] = (url.searchParams.get('state') ?? '').split('.')
  const state = rest.join('.')

  if (!allowed(env, extensionId)) return fail(null, 'Unknown extension', 403)
  const redirect = extensionCallback(extensionId)

  const denied = url.searchParams.get('error_description') ?? url.searchParams.get('error')
  if (denied) return fail(redirect, denied)
  if (!code) return fail(redirect, 'GitHub did not return a code')

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/callback`,
    }),
  })

  if (!response.ok) return fail(redirect, `GitHub returned ${response.status}`)
  const data = (await response.json()) as {
    access_token?: string
    error_description?: string
    error?: string
  }
  if (!data.access_token) {
    return fail(redirect, data.error_description ?? data.error ?? 'No token returned')
  }

  const back = new URL(redirect)
  back.hash = new URLSearchParams({ access_token: data.access_token, state }).toString()
  return Response.redirect(back.toString(), 302)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 })

    switch (url.pathname) {
      case '/start':
        return start(url, env)
      case '/callback':
        return callback(url, env)
      case '/health':
        return new Response('ok')
      default:
        return new Response('Not found', { status: 404 })
    }
  },
}
