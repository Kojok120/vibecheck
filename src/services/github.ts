import { blobToBase64 } from '@/core/data-url'
import type { RepoRef } from '@/core/repo'

const API = 'https://api.github.com'
const OAUTH = 'https://github.com/login'
const ACCEPT = 'application/vnd.github+json'

/**
 * The device flow is the only GitHub OAuth grant a client-side app can finish
 * without a server, because it never needs the client secret. The extension's
 * `github.com` host permission is what lets it call these endpoints directly.
 */

export interface DeviceCode {
  deviceCode: string
  userCode: string
  verificationUri: string
  /** Seconds to wait between polls. */
  interval: number
  expiresIn: number
}

interface OAuthResponse {
  error?: string
  error_description?: string
  interval?: number | string
  expires_in?: number | string
  device_code?: string
  user_code?: string
  verification_uri?: string
  access_token?: string
}

async function oauthPost(
  path: string,
  body: Record<string, string>,
): Promise<OAuthResponse> {
  const response = await fetch(`${OAUTH}/${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`GitHub returned ${response.status} for ${path}`)
  return (await response.json()) as OAuthResponse
}

export async function startDeviceFlow(clientId: string, scope = 'repo'): Promise<DeviceCode> {
  const data = await oauthPost('device/code', { client_id: clientId, scope })
  if (data.error || !data.device_code || !data.user_code || !data.verification_uri) {
    throw new Error(describeOAuthError(data))
  }
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    interval: Math.max(5, Number(data.interval) || 5),
    expiresIn: Number(data.expires_in) || 900,
  }
}

export interface PollOptions {
  signal?: AbortSignal
  onSlowDown?: (interval: number) => void
}

/** Poll until the reviewer approves the code in their browser, or time runs out. */
export async function pollDeviceFlow(
  clientId: string,
  device: DeviceCode,
  options: PollOptions = {},
): Promise<string> {
  let interval = device.interval
  const deadline = Date.now() + device.expiresIn * 1000

  while (Date.now() < deadline) {
    if (options.signal?.aborted) throw new Error('Sign-in cancelled')
    await sleep(interval * 1000, options.signal)

    const data = await oauthPost('oauth/access_token', {
      client_id: clientId,
      device_code: device.deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    })

    if (data.access_token) return data.access_token
    if (data.error === 'authorization_pending') continue
    if (data.error === 'slow_down') {
      interval = Math.max(interval + 5, Number(data.interval) || interval + 5)
      options.onSlowDown?.(interval)
      continue
    }
    throw new Error(describeOAuthError(data))
  }

  throw new Error('The sign-in code expired. Start again.')
}

function describeOAuthError(data: { error?: string; error_description?: string }): string {
  switch (data.error) {
    case 'expired_token':
      return 'The sign-in code expired. Start again.'
    case 'access_denied':
      return 'Sign-in was denied on GitHub.'
    case 'device_flow_disabled':
      return 'This OAuth app does not have device flow enabled. Turn it on in the app settings.'
    default:
      return data.error_description || data.error || 'GitHub sign-in failed'
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new Error('Sign-in cancelled'))
      },
      { once: true },
    )
  })
}

// ---- REST --------------------------------------------------------------

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

export interface GithubUser {
  login: string
  avatarUrl: string
}

export async function getUser(token: string): Promise<GithubUser> {
  const data = await api<{ login: string; avatar_url: string }>(token, '/user')
  return { login: data.login, avatarUrl: data.avatar_url }
}

export interface RepoInfo {
  isPrivate: boolean
  defaultBranch: string
  htmlUrl: string
}

export async function getRepo(token: string, ref: RepoRef): Promise<RepoInfo> {
  const data = await api<{ private: boolean; default_branch: string; html_url: string }>(
    token,
    `/repos/${ref.owner}/${ref.repo}`,
  )
  return {
    isPrivate: data.private,
    defaultBranch: data.default_branch,
    htmlUrl: data.html_url,
  }
}

/** Create the asset branch off the default branch the first time it is needed. */
export async function ensureAssetBranch(
  token: string,
  ref: RepoRef,
  branch: string,
  defaultBranch: string,
): Promise<void> {
  try {
    await api(token, `/repos/${ref.owner}/${ref.repo}/git/ref/heads/${branch}`)
    return
  } catch (error) {
    // Only a genuine "no such ref" means we should create one; an auth or
    // network failure must not be mistaken for a missing branch.
    if (!(error instanceof GithubError) || error.status !== 404) throw error
  }

  const base = await api<{ object: { sha: string } }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/git/ref/heads/${defaultBranch}`,
  )
  try {
    await api(token, `/repos/${ref.owner}/${ref.repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: base.object.sha }),
    })
  } catch (error) {
    // A parallel upload may have won the race; anything else is real.
    if (!(error instanceof GithubError) || error.status !== 422) throw error
  }
}

export interface AssetUrls {
  /** Renders inline in issue bodies — public repositories only. */
  rawUrl: string
  /** Always openable by anyone who can see the repository. */
  blobUrl: string
}

export async function uploadAsset(
  token: string,
  ref: RepoRef,
  branch: string,
  path: string,
  blob: Blob,
  message: string,
): Promise<AssetUrls> {
  const endpoint = `/repos/${ref.owner}/${ref.repo}/contents/${encodePath(path)}`
  const content = await blobToBase64(blob)

  try {
    await api(token, endpoint, {
      method: 'PUT',
      body: JSON.stringify({ message, content, branch }),
    })
  } catch (error) {
    // Updating an existing file requires its blob sha. Re-sending an item the
    // reviewer reopened lands on the same path, so this is the normal path on
    // a second attempt, not an edge case.
    if (!(error instanceof GithubError) || error.status !== 422) throw error
    const existing = await api<{ sha: string }>(token, `${endpoint}?ref=${encodeURIComponent(branch)}`)
    await api(token, endpoint, {
      method: 'PUT',
      body: JSON.stringify({ message, content, branch, sha: existing.sha }),
    })
  }

  return {
    rawUrl: `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${branch}/${encodePath(path)}`,
    blobUrl: `https://github.com/${ref.owner}/${ref.repo}/blob/${branch}/${encodePath(path)}`,
  }
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
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
