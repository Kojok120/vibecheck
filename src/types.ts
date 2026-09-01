/** Shared data model for VibeCheck. */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface PageInfo {
  url: string
  title: string
  viewportWidth: number
  viewportHeight: number
  dpr: number
  scrollY: number
}

export interface TargetInfo {
  /** CSS selector for the element under the centre of the selection. */
  selector: string
  tag: string
  text?: string
  /** Selection rectangle in CSS pixels, relative to the viewport. */
  rect: Rect
}

export type ItemKind = 'shot' | 'comment'

export interface PostedRefs {
  github?: string
  slack?: string
  discord?: string
}

export interface FeedbackItem {
  id: string
  createdAt: number
  kind: ItemKind
  /** Why this came up — the reviewer's context. */
  background: string
  /** What should change. */
  request: string
  page: PageInfo
  target?: TargetInfo
  /** IndexedDB key of the cropped PNG, when kind === 'shot'. */
  shotKey?: string
  shotWidth?: number
  shotHeight?: number
  checked: boolean
  posted?: PostedRefs
}

export interface Session {
  id: string
  title: string
  origin: string
  createdAt: number
  updatedAt: number
  items: FeedbackItem[]
}

export type Locale = 'ja' | 'en'

export interface GithubSettings {
  /** Overrides the bundled OAuth client id (for forks and org installs). */
  clientId: string
  token?: string
  login?: string
  /** "owner/repo" */
  defaultRepo?: string
  assetBranch: string
  recentRepos: string[]
}

export interface SlackSettings {
  token?: string
  teamName?: string
  channelId?: string
  channelName?: string
}

export interface DiscordWebhook {
  id: string
  name: string
  url: string
}

export interface DiscordSettings {
  webhooks: DiscordWebhook[]
  defaultId?: string
}

export interface Settings {
  locale: Locale | 'auto'
  github: GithubSettings
  slack: SlackSettings
  discord: DiscordSettings
}

export interface CaptureResult {
  shotKey: string
  width: number
  height: number
}

/** What the overlay knows about an item; the store fills in id/order/state. */
export type NewItem = Omit<FeedbackItem, 'id' | 'createdAt' | 'checked' | 'posted'>
