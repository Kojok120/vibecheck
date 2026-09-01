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
  githubBody: 'Used to open issues and to upload the screenshots they reference.',
  connect: 'Connect',
  disconnect: 'Disconnect',
  connectedAs: (login: string) => `Connected as ${login}`,
  deviceCodeHint: 'Enter this code on the GitHub page that opens.',
  copyCode: 'Copy code',
  openGithub: 'Open GitHub',
  waiting: 'Waiting for approval…',
  clientId: 'OAuth app client ID',
  clientIdHint:
    'Create an OAuth app with "Enable Device Flow" ticked and paste its client ID here. See the setup guide below.',
  clientIdMissing: 'Add an OAuth app client ID first.',
  assetBranch: 'Screenshot branch',
  assetBranchHint:
    'Screenshots are committed here and referenced from the issue, away from your default branch.',
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
  githubBody: 'Issue の起票と、スクリーンショットのアップロードに使います。',
  connect: '接続する',
  disconnect: '切断',
  connectedAs: (login: string) => `${login} として接続中`,
  deviceCodeHint: 'GitHub のページで下のコードを入力してください。',
  copyCode: 'コードをコピー',
  openGithub: 'GitHub を開く',
  waiting: '承認を待っています…',
  clientId: 'OAuth App の Client ID',
  clientIdHint:
    '「Enable Device Flow」にチェックを入れた OAuth App を作成し、その Client ID を貼り付けてください。手順は下のセットアップガイドにあります。',
  clientIdMissing: '先に OAuth App の Client ID を設定してください。',
  assetBranch: 'スクリーンショットを置くブランチ',
  assetBranchHint:
    'このブランチに画像をコミットし、Issue から参照します。既定ブランチからは分離されます。',
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
