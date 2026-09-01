import { browser } from 'wxt/browser'
import type { RepoRef } from '@/core/repo'

const API = 'https://api.github.com'
const ACCEPT = 'application/vnd.github+json'

/** Carries the status code so callers can branch on it instead of on text. */
export class GithubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'GithubError'
  }
}

async function api<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: ACCEPT,
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { message?: string } | null
    throw new GithubError(
      response.status,
      `GitHub ${response.status}: ${detail?.message ?? response.statusText}`.trim(),
    )
  }
  return (response.status === 204 ? null : await response.json()) as T
}

/**
 * Sign in with one click.
 *
 * GitHub requires a client secret to turn an authorization code into a token —
 * PKCE does not lift that — and an extension cannot hold one. A small hosted
 * endpoint does the exchange; see `worker/` in this repository. The extension
 * never sees the secret, and the token comes straight back here.
 */
export async function connect(authEndpoint: string): Promise<string> {
  const state = crypto.randomUUID()
  const start = new URL(`${authEndpoint.replace(/\/$/, '')}/start`)
  start.searchParams.set('ext', browser.runtime.id)
  start.searchParams.set('state', state)

  const redirected = await browser.identity.launchWebAuthFlow({
    url: start.toString(),
    interactive: true,
  })
  if (!redirected) throw new Error('Sign-in was cancelled')

  const result = new URLSearchParams(new URL(redirected).hash.slice(1))
  const error = result.get('error')
  if (error) throw new Error(error)
  if (result.get('state') !== state) throw new Error('Sign-in response did not match the request')

  const token = result.get('access_token')
  if (!token) throw new Error('GitHub did not return a token')
  return token
}

export interface GithubUser {
  login: string
  avatarUrl: string
}

export async function getUser(token: string): Promise<GithubUser> {
  const data = await api<{ login: string; avatar_url: string }>(token, '/user')
  return { login: data.login, avatarUrl: data.avatar_url }
}

export interface CreatedIssue {
  number: number
  htmlUrl: string
}

export async function createIssue(
  token: string,
  ref: RepoRef,
  title: string,
  body: string,
): Promise<CreatedIssue> {
  const data = await api<{ number: number; html_url: string }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/issues`,
    { method: 'POST', body: JSON.stringify({ title, body }) },
  )
  return { number: data.number, htmlUrl: data.html_url }
}
