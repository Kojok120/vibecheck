import type { Widen } from '@/core/dict'
import type { Destination, Locale } from '@/types'

const EN = {
  appName: 'VibeCheck',
  emptyTitle: 'No feedback yet',
  emptyBody: 'Press {shortcut} on a page, then S to select an area or C to leave a comment.',
  shortcutMissing: 'No keyboard shortcut is assigned',
  shortcutFix: 'Set the keyboard shortcut',
  newSession: 'New review',
  deleteSession: 'Delete this review',
  deleteSessionConfirm: 'Delete this review and its screenshots?',
  sessions: 'Reviews',
  settings: 'Settings',
  background: 'Background',
  request: 'Requested change',
  backgroundPlaceholder: 'What you noticed, and the situation',
  requestPlaceholder: 'What should change',
  selectAll: 'Select all',
  selected: (n: number) => `${n} selected`,
  copy: 'Copy',
  copySheet: 'Numbered image',
  copyMarkdown: 'Markdown (saves images, links by path)',
  copyText: 'Text only',
  save: 'Save',
  issue: 'Issue',
  slack: 'Slack',
  discord: 'Discord',
  delete: 'Delete',
  screenshot: 'Screenshot',
  doneCount: (n: number) => `Done (${n})`,
  reopen: 'Reopen',
  allDone: 'Everything here is handled',
  allDoneBody: 'Reopen an item below, or keep capturing on the page.',
  via: (destination: Destination) =>
    ({ copy: 'Copied', save: 'Saved', github: 'Issue', slack: 'Slack', discord: 'Discord' })[
      destination
    ],
  moveUp: 'Move up',
  moveDown: 'Move down',
  working: 'Working…',
  copiedSheet: 'Copied the numbered image',
  copiedText: 'Copied',
  savedTo: (folder: string) => `Saved to ${folder}`,
  postedSlack: 'Posted to Slack',
  postedDiscord: 'Posted to Discord',
  issueCreated: (n: number) => `Created issue #${n}`,
  nothingSelected: 'Select at least one item',
  injectFailed: 'VibeCheck cannot run on this page. Try it on an ordinary http(s) page.',
  missingPaths: 'Some screenshots could not be located on disk, so their links were left out.',
  needsGithub: 'Connect GitHub first',
  needsSlack: 'Set up Slack first',
  needsDiscord: 'Add a Discord webhook first',
  chooseRepo: 'Repository',
  chooseChannel: 'Channel',
  chooseWebhook: 'Webhook',
  send: 'Send',
  cancel: 'Cancel',
  issueNotice:
    'The issue text is created for you. The numbered image goes to your clipboard — paste it into the issue that opens.',
  pasteAfterIssue: 'Issue created. The numbered image is on your clipboard — paste it in.',
} as const

export type PanelStrings = Widen<typeof EN>

const JA: PanelStrings = {
  appName: 'VibeCheck',
  emptyTitle: '指摘はまだありません',
  emptyBody: 'ページで {shortcut} を押し、S で範囲を選択、C でコメントだけ残せます。',
  shortcutMissing: 'ショートカットが未割り当てです',
  shortcutFix: 'キーボードショートカットを設定',
  newSession: '新しいレビュー',
  deleteSession: 'このレビューを削除',
  deleteSessionConfirm: 'このレビューとスクリーンショットを削除しますか？',
  sessions: 'レビュー',
  settings: '設定',
  background: '背景',
  request: 'アップデート内容',
  backgroundPlaceholder: 'なぜ気づいたか / どういう状況か',
  requestPlaceholder: 'どう変えてほしいか',
  selectAll: 'すべて選択',
  selected: (n: number) => `${n}件選択中`,
  copy: 'コピー',
  copySheet: '合成画像（番号つき）',
  copyMarkdown: 'Markdown（画像を保存してパス付き）',
  copyText: 'テキストのみ',
  save: '保存',
  issue: 'Issue',
  slack: 'Slack',
  discord: 'Discord',
  delete: '削除',
  screenshot: 'スクリーンショット',
  doneCount: (n: number) => `対応済み (${n})`,
  reopen: '戻す',
  allDone: 'すべて対応済みです',
  allDoneBody: '下の一覧から戻すか、ページで指摘を追加してください。',
  via: (destination: Destination) =>
    ({ copy: 'コピー済み', save: '保存済み', github: 'Issue', slack: 'Slack', discord: 'Discord' })[
      destination
    ],
  moveUp: '上へ',
  moveDown: '下へ',
  // status
  working: '処理中…',
  copiedSheet: '合成画像をコピーしました',
  copiedText: 'コピーしました',
  savedTo: (folder: string) => `${folder} に保存しました`,
  postedSlack: 'Slack に投稿しました',
  postedDiscord: 'Discord に投稿しました',
  issueCreated: (n: number) => `Issue #${n} を作成しました`,
  nothingSelected: '指摘を選択してください',
  injectFailed: 'このページでは起動できません。通常の http(s) ページでお試しください。',
  missingPaths: '一部のスクリーンショットの保存先を特定できず、リンクを省きました。',
  needsGithub: 'GitHub と接続してください',
  needsSlack: 'Slack の設定が必要です',
  needsDiscord: 'Discord Webhook を登録してください',
  // destination pickers
  chooseRepo: 'リポジトリ',
  chooseChannel: 'チャンネル',
  chooseWebhook: 'Webhook',
  send: '送信',
  cancel: 'キャンセル',
  issueNotice:
    'Issue の本文は自動で作成します。番号入り合成画像はクリップボードに入るので、開いた Issue に貼り付けてください。',
  pasteAfterIssue: 'Issue を作成しました。合成画像をクリップボードに入れたので貼り付けてください。',
}

export const PANEL_STRINGS: Record<Locale, PanelStrings> = { en: EN, ja: JA }

export function panelStrings(locale: Locale): PanelStrings {
  return PANEL_STRINGS[locale]
}
