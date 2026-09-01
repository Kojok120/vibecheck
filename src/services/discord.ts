/** Discord's message body cap; anything longer is rejected outright. */
export const DISCORD_CONTENT_LIMIT = 2000
export const DISCORD_FILE_LIMIT = 10

export interface DiscordUpload {
  name: string
  blob: Blob
}

// `discordapp.com` webhooks are still handed out and still work.
const WEBHOOK = /^https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+/

export function isWebhookUrl(url: string): boolean {
  return WEBHOOK.test(url.trim())
}

export function truncateContent(text: string, limit = DISCORD_CONTENT_LIMIT): string {
  const characters = [...text]
  if (characters.length <= limit) return text
  // Slicing by code unit would leave a lone surrogate at the cut.
  return `${characters.slice(0, limit - 1).join('')}…`
}

/**
 * A webhook post carries the body and up to ten attachments in one message, so
 * screenshots stay next to the text that explains them.
 */
export async function postFeedback(
  webhookUrl: string,
  content: string,
  files: DiscordUpload[],
): Promise<void> {
  if (!isWebhookUrl(webhookUrl)) throw new Error('That does not look like a Discord webhook URL')

  const attachments = files.slice(0, DISCORD_FILE_LIMIT)
  const form = new FormData()
  form.append(
    'payload_json',
    JSON.stringify({
      content: truncateContent(content),
      allowed_mentions: { parse: [] },
      attachments: attachments.map((file, index) => ({ id: index, filename: file.name })),
    }),
  )
  attachments.forEach((file, index) => {
    form.append(`files[${index}]`, file.blob, file.name)
  })

  // Webhook URLs legitimately carry `?thread_id=`, so the flag has to be set
  // on the parsed URL rather than concatenated.
  const endpoint = new URL(webhookUrl.trim())
  endpoint.searchParams.set('wait', 'true')
  const response = await fetch(endpoint, { method: 'POST', body: form })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Discord ${response.status}: ${detail.slice(0, 200) || response.statusText}`)
  }
}
