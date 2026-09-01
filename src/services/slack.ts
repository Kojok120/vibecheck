const API = 'https://slack.com/api'

/**
 * Incoming webhooks cannot attach files, so Slack needs a bot token. The
 * three-step external upload is the only way to land several images and a
 * message body in one post.
 */

async function parse<T>(response: Response): Promise<{ ok: boolean; error?: string } & T> {
  if (!response.ok && response.status !== 200) {
    // A proxy or captive portal returns HTML, and `json()` would then throw a
    // SyntaxError that says nothing about what actually happened.
    throw new Error(`Slack returned ${response.status} ${response.statusText}`)
  }
  try {
    return (await response.json()) as { ok: boolean; error?: string } & T
  } catch {
    throw new Error('Slack returned a response that was not JSON')
  }
}

async function call<T>(token: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await parse<T>(response)
  if (!data.ok) throw new Error(`Slack: ${data.error ?? response.statusText}`)
  return data
}

export interface SlackIdentity {
  team: string
  user: string
}

export async function verifyToken(token: string): Promise<SlackIdentity> {
  const data = await call<{ team: string; user: string }>(token, 'auth.test')
  return { team: data.team, user: data.user }
}

export interface SlackChannel {
  id: string
  name: string
  isPrivate: boolean
}

export async function listChannels(token: string): Promise<SlackChannel[]> {
  const channels: SlackChannel[] = []
  let cursor = ''

  // Slack pages this endpoint regardless of `limit`, so a big workspace would
  // silently show only part of its channels.
  for (let page = 0; page < 20; page += 1) {
    const params = new URLSearchParams({
      limit: '200',
      exclude_archived: 'true',
      types: 'public_channel,private_channel',
      ...(cursor ? { cursor } : {}),
    })
    const response = await fetch(`${API}/conversations.list?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await parse<{
      channels?: { id: string; name: string; is_private: boolean }[]
      response_metadata?: { next_cursor?: string }
    }>(response)
    if (!data.ok) throw new Error(`Slack: ${data.error ?? response.statusText}`)

    for (const channel of data.channels ?? []) {
      channels.push({ id: channel.id, name: channel.name, isPrivate: channel.is_private })
    }
    cursor = data.response_metadata?.next_cursor ?? ''
    if (!cursor) break
  }

  return channels.sort((a, b) => a.name.localeCompare(b.name))
}

export interface SlackUpload {
  name: string
  title: string
  blob: Blob
}

async function reserveUpload(
  token: string,
  file: SlackUpload,
): Promise<{ uploadUrl: string; fileId: string }> {
  const params = new URLSearchParams({
    filename: file.name,
    length: String(file.blob.size),
  })
  const response = await fetch(`${API}/files.getUploadURLExternal?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = (await response.json()) as {
    ok: boolean
    error?: string
    upload_url?: string
    file_id?: string
  }
  if (!data.ok || !data.upload_url || !data.file_id) {
    throw new Error(`Slack: ${data.error ?? 'could not reserve an upload URL'}`)
  }
  return { uploadUrl: data.upload_url, fileId: data.file_id }
}

export interface SlackPost {
  channelId: string
  text: string
  files: SlackUpload[]
}

/** Post the message and every screenshot as a single Slack message. */
export async function postFeedback(token: string, post: SlackPost): Promise<void> {
  const uploaded: { id: string; title: string }[] = []

  for (const file of post.files) {
    const { uploadUrl, fileId } = await reserveUpload(token, file)
    const form = new FormData()
    form.append('file', file.blob, file.name)
    const upload = await fetch(uploadUrl, { method: 'POST', body: form })
    if (!upload.ok) throw new Error(`Slack upload failed (${upload.status})`)
    uploaded.push({ id: fileId, title: file.title })
  }

  if (uploaded.length === 0) {
    await call(token, 'chat.postMessage', { channel: post.channelId, text: post.text })
    return
  }

  await call(token, 'files.completeUploadExternal', {
    files: uploaded,
    channel_id: post.channelId,
    initial_comment: post.text,
  })
}
