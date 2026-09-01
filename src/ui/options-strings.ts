import type { Widen } from '@/core/dict'
import type { Locale } from '@/types'

const EN = {
  title: 'VibeCheck settings',
  subtitle:
    'Connect the places your feedback should go. Copy and save work without any of this.',
  language: 'Language',
  auto: 'Auto',
  japanese: '日本語',
  english: 'English',
  shortcut: 'Shortcut',
  shortcutBody:
    'Press it on a page to start capturing. Assign or change it at chrome://extensions/shortcuts.',
  shortcutNone: 'Not assigned',
  openShortcuts: 'Open shortcut settings',
  github: 'GitHub',
  githubBody: 'Used to open issues on your behalf.',
  githubConnectHint:
    'One click: GitHub asks you to authorize VibeCheck, and that is the whole setup.',
  connect: 'Connect GitHub',
  disconnect: 'Disconnect',
  connectedAs: (login: string) => `Connected as ${login}`,
  cancel: 'Cancel',
  cleared: 'Deleted',
  clearBlocked: 'Close the VibeCheck side panel and try again.',
  badWebhookUrl: 'That does not look like a Discord webhook URL.',
  advanced: 'Advanced',
  authEndpoint: 'Sign-in endpoint',
  authEndpointHint:
    'Completes the GitHub exchange, which needs a secret an extension cannot hold. Change it only if you run your own copy of `worker/`.',
  authEndpointMissing: 'Set a sign-in endpoint first.',
  defaultRepo: 'Default repository',
  slack: 'Slack',
  slackBody: 'Posts the write-up and every screenshot as a single message.',
  slackToken: 'Bot user OAuth token',
  slackTokenHint: 'Needs chat:write, files:write, channels:read and groups:read.',
  verify: 'Verify',
  slackConnected: (team: string, user: string) => `Connected to ${team} as ${user}`,
  discord: 'Discord',
  discordBody: 'Add a webhook URL to post straight into that channel.',
  webhookName: 'Label',
  webhookUrl: 'Webhook URL',
  add: 'Add',
  remove: 'Remove',
  saved: 'Saved',
  setupGuide: 'Setup guide',
  danger: 'Data',
  clearAll: 'Delete all feedback and tokens',
  clearConfirm: 'Delete everything? This cannot be undone.',
} as const

export type OptionsStrings = Widen<typeof EN>

const JA: OptionsStrings = {
  title: 'VibeCheck 設定',
  subtitle: 'レビュー指摘の送信先を接続します。設定しなくてもコピーと保存は使えます。',
  language: '表示言語',
  auto: '自動',
  japanese: '日本語',
  english: 'English',
  shortcut: 'ショートカット',
  shortcutBody:
    'ページで押すとツールが起動します。未割り当てや変更は chrome://extensions/shortcuts から。',
  shortcutNone: '未割り当て',
  openShortcuts: 'ショートカット設定を開く',
  github: 'GitHub',
  githubBody: 'Issue の起票に使います。',
  githubConnectHint:
    'ボタンを押すと GitHub の許可画面が開きます。許可すれば設定は完了です。',
  connect: 'GitHub と接続',
  disconnect: '切断',
  connectedAs: (login: string) => `${login} として接続中`,
  cancel: 'キャンセル',
  cleared: '削除しました',
  clearBlocked: 'VibeCheck のサイドパネルを閉じてから、もう一度お試しください。',
  badWebhookUrl: 'Discord の Webhook URL の形式ではありません。',
  advanced: '詳細設定',
  authEndpoint: 'サインイン用エンドポイント',
  authEndpointHint:
    'GitHub のトークン交換にはシークレットが必要で、拡張機能内には置けないため中継します。`worker/` を自分で動かす場合だけ変更してください。',
  authEndpointMissing: '先にサインイン用エンドポイントを設定してください。',
  defaultRepo: '既定のリポジトリ',
  slack: 'Slack',
  slackBody: '本文と複数のスクリーンショットを1つのメッセージとして投稿します。',
  slackToken: 'Bot User OAuth Token',
  slackTokenHint: 'chat:write / files:write / channels:read / groups:read が必要です。',
  verify: '確認',
  slackConnected: (team: string, user: string) => `${team} に ${user} として接続中`,
  discord: 'Discord',
  discordBody: 'Webhook URL を登録すると、そのチャンネルに直接投稿できます。',
  webhookName: '表示名',
  webhookUrl: 'Webhook URL',
  add: '追加',
  remove: '削除',
  saved: '保存しました',
  setupGuide: 'セットアップ手順',
  danger: 'データ',
  clearAll: 'すべての指摘とトークンを削除',
  clearConfirm: 'すべて削除しますか？この操作は取り消せません。',
}

export const OPTIONS_STRINGS: Record<Locale, OptionsStrings> = { en: EN, ja: JA }

export function optionsStrings(locale: Locale): OptionsStrings {
  return OPTIONS_STRINGS[locale]
}
