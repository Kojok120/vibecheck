import { browser } from 'wxt/browser'
import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script'
import type { Widen } from '@/core/dict'
import { resolveLocale } from '@/core/i18n'
import { centreOf, isUsableSelection, rectFromDrag } from '@/core/geometry'
import { buildSelector, elementText } from '@/core/selector'
import { errorMessage, request } from '@/services/messages'
import { loadSettings } from '@/services/settings'
import { loadState } from '@/services/store'
import type { Locale, NewItem, PageInfo, Rect, TargetInfo } from '@/types'

const HOST_ID = 'vibecheck-overlay-root'
const TOGGLE_EVENT = 'vibecheck:toggle'

type Mode = 'idle' | 'selecting' | 'composing'

const UI_EN = {
  hint: '<b>S</b> select an area <span>·</span> <b>C</b> comment only <span>·</span> <b>Esc</b> close',
  selectHint: 'Drag to select an area <span>·</span> <b>Esc</b> to go back',
  background: 'Background',
  request: 'Requested change',
  backgroundPlaceholder: 'What you noticed, and the situation',
  requestPlaceholder: 'What should change',
  save: 'Add',
  cancel: 'Cancel',
  saveHint: '⌘↵ to add',
  added: (n: number) => `Added #${n}`,
} as const

type OverlayStrings = Widen<typeof UI_EN>

const UI_JA: OverlayStrings = {
  hint: '<b>S</b> 範囲を選択 <span>·</span> <b>C</b> コメントのみ <span>·</span> <b>Esc</b> 終了',
  selectHint: 'ドラッグして範囲を選択 <span>·</span> <b>Esc</b> で戻る',
  background: '背景',
  request: 'アップデート内容',
  backgroundPlaceholder: 'なぜ気づいたか / どういう状況か',
  requestPlaceholder: 'どう変えてほしいか',
  save: '追加',
  cancel: 'キャンセル',
  saveHint: '⌘↵ で追加',
  added: (n: number) => `#${n} を追加しました`,
}

const UI: Record<Locale, OverlayStrings> = { en: UI_EN, ja: UI_JA }

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: ui-sans-serif, -apple-system, "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif; }
.layer { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }
.layer.grabbing { pointer-events: auto; cursor: crosshair; }

.hud {
  position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 10px;
  padding: 9px 16px; border-radius: 999px;
  background: rgba(23, 20, 38, .94); color: #F4F2FF;
  font-size: 12.5px; line-height: 1; letter-spacing: .01em;
  box-shadow: 0 8px 28px rgba(15, 12, 30, .38), 0 0 0 1px rgba(255,255,255,.09) inset;
  pointer-events: auto; white-space: nowrap;
  backdrop-filter: blur(8px);
}
.hud b { display: inline-block; min-width: 18px; padding: 3px 6px; margin-right: 2px;
  border-radius: 5px; background: rgba(255,255,255,.14); font-weight: 600; text-align: center; }
.hud span { opacity: .38; }
.hud .dot { width: 7px; height: 7px; border-radius: 50%; background: #F9A8D4; flex: none; }
.hud .count { padding-left: 10px; margin-left: 2px; border-left: 1px solid rgba(255,255,255,.16); opacity: .72; }

.marquee { position: fixed; border: 1.5px solid #C4B5FD; background: rgba(139, 92, 246, .10);
  box-shadow: 0 0 0 100vmax rgba(17, 14, 30, .34); pointer-events: none; }
.size { position: fixed; padding: 3px 7px; border-radius: 5px; background: #171426; color: #F4F2FF;
  font-size: 11px; font-variant-numeric: tabular-nums; pointer-events: none; white-space: nowrap; }

.card {
  position: fixed; width: 340px; max-width: calc(100vw - 24px);
  padding: 14px; border-radius: 14px;
  background: #FFFFFF; color: #171426;
  box-shadow: 0 18px 48px rgba(15, 12, 30, .26), 0 0 0 1px rgba(23, 20, 38, .10);
  pointer-events: auto;
}
.card .field + .field { margin-top: 10px; }
.card label { display: block; margin-bottom: 5px; font-size: 11px; font-weight: 600;
  letter-spacing: .04em; text-transform: uppercase; color: #6B6580; }
.card textarea {
  display: block; width: 100%; min-height: 54px; max-height: 200px; padding: 8px 10px;
  border: 1px solid #DDD9E8; border-radius: 9px; resize: vertical;
  font-size: 13px; line-height: 1.55; color: #171426; background: #FBFAFF;
}
.card textarea:focus { outline: 2px solid #8B5CF6; outline-offset: -1px; border-color: transparent; }
.card .row { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.card .hint { flex: 1; font-size: 11px; color: #8A83A3; }
.card button { padding: 7px 13px; border: 0; border-radius: 8px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.card button.primary { background: #7C5CFF; color: #fff; }
.card button.primary:hover { background: #6D4BF0; }
.card button.ghost { background: transparent; color: #6B6580; }
.card button.ghost:hover { background: #F1EEF9; }

.toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  padding: 9px 16px; border-radius: 999px; background: rgba(23, 20, 38, .94); color: #F4F2FF;
  font-size: 12.5px; pointer-events: none;
  box-shadow: 0 8px 28px rgba(15, 12, 30, .34);
}
.toast.error { background: #B4243C; }

@media (prefers-color-scheme: dark) {
  .card { background: #1D1A2B; color: #EFEDF8; box-shadow: 0 18px 48px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.09); }
  .card label { color: #A29CBC; }
  .card textarea { background: #14121F; border-color: #322D46; color: #EFEDF8; }
  .card .hint { color: #8F88AB; }
  .card button.ghost { color: #A29CBC; }
  .card button.ghost:hover { background: #2A2540; }
}
`

interface Pending {
  rect: Rect
  target?: TargetInfo
  shot?: { shotKey: string; width: number; height: number }
}

class Overlay {
  private readonly host: HTMLElement
  private readonly root: ShadowRoot
  private readonly layer: HTMLDivElement
  private locale: Locale = 'en'
  private mode: Mode = 'idle'
  private active = false
  private dragStart: { x: number; y: number } | null = null
  private pending: Pending | null = null
  private itemCount = 0
  private toastTimer: number | undefined

  constructor() {
    this.host = document.createElement('div')
    this.host.id = HOST_ID
    this.root = this.host.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = CSS
    this.layer = document.createElement('div')
    this.layer.className = 'layer'
    this.root.append(style, this.layer)
    document.documentElement.appendChild(this.host)

    void this.resolveLocale()
    window.addEventListener('keydown', this.onKeyDown, true)
    window.addEventListener(TOGGLE_EVENT, this.toggle)
  }

  private get t() {
    return UI[this.locale]
  }

  private async resolveLocale(): Promise<void> {
    try {
      const settings = await loadSettings()
      this.locale = resolveLocale(settings.locale, browser.i18n.getUILanguage())
    } catch {
      this.locale = navigator.language.startsWith('ja') ? 'ja' : 'en'
    }
    if (this.active && this.mode === 'idle') this.render()
  }

  toggle = (): void => {
    if (this.active) this.deactivate()
    else this.activate()
  }

  activate(): void {
    this.active = true
    this.mode = 'idle'
    const focused = document.activeElement as HTMLElement | null
    // Give the shortcut keys a clean slate: a focused editor would swallow S/C.
    if (focused && isEditable(focused)) focused.blur()
    this.render()
    void this.syncCount()
  }

  /** Show how many items the current session already holds. */
  private async syncCount(): Promise<void> {
    try {
      const { sessions, activeSessionId } = await loadState()
      const active = sessions.find((s) => s.id === activeSessionId)
      this.setItemCount(active?.items.length ?? 0)
    } catch {
      /* the count is a nicety, never a blocker */
    }
  }

  deactivate(): void {
    this.active = false
    this.mode = 'idle'
    this.discardPending()
    this.render()
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown, true)
    window.removeEventListener(TOGGLE_EVENT, this.toggle)
    this.host.remove()
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.active) return

    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (this.mode === 'composing') this.cancelCompose()
      else if (this.mode === 'selecting') this.setMode('idle')
      else this.deactivate()
      return
    }

    if (this.mode !== 'idle') return
    const key = event.key.toLowerCase()
    if (key !== 's' && key !== 'c') return
    if (event.metaKey || event.ctrlKey || event.altKey) return

    event.preventDefault()
    event.stopPropagation()
    if (key === 's') this.setMode('selecting')
    else this.startComment(null)
  }

  private setMode(mode: Mode): void {
    this.mode = mode
    this.dragStart = null
    this.render()
  }

  // ---- selection -------------------------------------------------------

  private onPointerDown = (event: PointerEvent): void => {
    if (this.mode !== 'selecting' || event.button !== 0) return
    event.preventDefault()
    this.dragStart = { x: event.clientX, y: event.clientY }
    this.layer.setPointerCapture(event.pointerId)
    this.renderMarquee({ x: event.clientX, y: event.clientY, width: 0, height: 0 })
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.dragStart) return
    this.renderMarquee(rectFromDrag(this.dragStart, { x: event.clientX, y: event.clientY }))
  }

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.dragStart) return
    const rect = rectFromDrag(this.dragStart, { x: event.clientX, y: event.clientY })
    this.dragStart = null
    if (!isUsableSelection(rect)) {
      this.render()
      return
    }
    void this.captureAndCompose(rect)
  }

  private async captureAndCompose(rect: Rect): Promise<void> {
    try {
      const target = describeTarget(rect)
      const shot = await this.withHiddenChrome(() =>
        request({ type: 'capture', rect, dpr: window.devicePixelRatio }),
      )
      this.pending = { rect, shot, ...(target ? { target } : {}) }
      this.mode = 'composing'
      this.render()
    } catch (error) {
      this.pending = null
      this.setMode('idle')
      this.toast(errorMessage(error), true)
    }
  }

  /**
   * `captureVisibleTab` photographs whatever is on screen, so the marquee and
   * HUD have to be gone — and actually painted away — before the shot.
   */
  private async withHiddenChrome<T>(fn: () => Promise<T>): Promise<T> {
    this.host.style.visibility = 'hidden'
    await nextFrame()
    await nextFrame()
    try {
      return await fn()
    } finally {
      this.host.style.visibility = ''
    }
  }

  // ---- compose ---------------------------------------------------------

  private startComment(rect: Rect | null): void {
    const target = rect ? describeTarget(rect) : undefined
    this.pending = {
      rect: rect ?? viewportCentreRect(),
      ...(target ? { target } : {}),
    }
    this.mode = 'composing'
    this.render()
  }

  private cancelCompose(): void {
    this.discardPending()
    this.setMode('idle')
  }

  private discardPending(): void {
    const shotKey = this.pending?.shot?.shotKey
    if (shotKey) void request({ type: 'discard-shot', shotKey })
    this.pending = null
  }

  private async submit(background: string, requestText: string): Promise<void> {
    const pending = this.pending
    if (!pending) return
    if (!background.trim() && !requestText.trim()) return

    const item: NewItem = {
      kind: pending.shot ? 'shot' : 'comment',
      background: background.trim(),
      request: requestText.trim(),
      page: pageInfo(),
      ...(pending.shot
        ? {
            shotKey: pending.shot.shotKey,
            shotWidth: pending.shot.width,
            shotHeight: pending.shot.height,
          }
        : {}),
      ...(pending.target ? { target: pending.target } : {}),
    }

    this.pending = null
    this.setMode('idle')

    try {
      const { seq } = await request({ type: 'add-item', item })
      this.itemCount = seq
      this.render()
      this.toast(this.t.added(seq))
    } catch (error) {
      this.toast(errorMessage(error), true)
    }
  }

  // ---- rendering -------------------------------------------------------

  private render(): void {
    this.layer.replaceChildren()
    this.layer.classList.toggle('grabbing', this.mode === 'selecting')
    this.layer.onpointerdown = this.mode === 'selecting' ? this.onPointerDown : null
    this.layer.onpointermove = this.mode === 'selecting' ? this.onPointerMove : null
    this.layer.onpointerup = this.mode === 'selecting' ? this.onPointerUp : null

    if (!this.active) return

    if (this.mode !== 'composing') this.layer.appendChild(this.renderHud())
    if (this.mode === 'composing' && this.pending) this.layer.appendChild(this.renderCard())
  }

  private renderHud(): HTMLElement {
    const hud = document.createElement('div')
    hud.className = 'hud'
    const dot = document.createElement('div')
    dot.className = 'dot'
    const text = document.createElement('div')
    text.innerHTML = this.mode === 'selecting' ? this.t.selectHint : this.t.hint
    hud.append(dot, text)
    if (this.itemCount > 0) {
      const count = document.createElement('div')
      count.className = 'count'
      count.textContent = `${this.itemCount}`
      hud.appendChild(count)
    }
    return hud
  }

  private renderMarquee(rect: Rect): void {
    this.layer.replaceChildren()
    const box = document.createElement('div')
    box.className = 'marquee'
    Object.assign(box.style, {
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })
    const size = document.createElement('div')
    size.className = 'size'
    size.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`
    const below = rect.y + rect.height + 8
    Object.assign(size.style, {
      left: `${rect.x}px`,
      top: below + 22 > window.innerHeight ? `${rect.y - 26}px` : `${below}px`,
    })
    this.layer.append(box, size)
  }

  private renderCard(): HTMLElement {
    const pending = this.pending!
    const card = document.createElement('div')
    card.className = 'card'

    const background = field(this.t.background, this.t.backgroundPlaceholder)
    const changes = field(this.t.request, this.t.requestPlaceholder)
    card.append(background.wrapper, changes.wrapper)

    const row = document.createElement('div')
    row.className = 'row'
    const hint = document.createElement('div')
    hint.className = 'hint'
    hint.textContent = this.t.saveHint
    const cancel = document.createElement('button')
    cancel.className = 'ghost'
    cancel.textContent = this.t.cancel
    cancel.onclick = () => this.cancelCompose()
    const save = document.createElement('button')
    save.className = 'primary'
    save.textContent = this.t.save
    const commit = () => void this.submit(background.input.value, changes.input.value)
    save.onclick = commit
    row.append(hint, cancel, save)
    card.appendChild(row)

    for (const input of [background.input, changes.input]) {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          commit()
        }
      })
    }

    placeCard(card, pending.rect)
    queueMicrotask(() => background.input.focus())
    return card
  }

  private toast(message: string, isError = false): void {
    this.clearToast()
    const toast = document.createElement('div')
    toast.className = isError ? 'toast error' : 'toast'
    toast.textContent = message
    toast.dataset.role = 'toast'
    this.layer.appendChild(toast)
    this.toastTimer = window.setTimeout(() => toast.remove(), isError ? 5000 : 1800)
  }

  private clearToast(): void {
    window.clearTimeout(this.toastTimer)
    this.layer.querySelector('[data-role="toast"]')?.remove()
  }

  private setItemCount(count: number): void {
    this.itemCount = count
    if (this.active && this.mode === 'idle') this.render()
  }
}

// ---- helpers -----------------------------------------------------------

function field(label: string, placeholder: string) {
  const wrapper = document.createElement('div')
  wrapper.className = 'field'
  const el = document.createElement('label')
  el.textContent = label
  const input = document.createElement('textarea')
  input.placeholder = placeholder
  input.rows = 2
  wrapper.append(el, input)
  return { wrapper, input }
}

/**
 * `requestAnimationFrame` never fires in a throttled, occluded or background
 * tab. Waiting on it unguarded leaves the overlay hidden and the capture hung,
 * so the frame wait is always time-bounded.
 */
function nextFrame(timeout = 60): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeout)
    requestAnimationFrame(() => {
      clearTimeout(timer)
      resolve()
    })
  })
}

function isEditable(el: HTMLElement): boolean {
  return (
    el.isContentEditable ||
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT'
  )
}

function pageInfo(): PageInfo {
  return {
    url: location.href,
    title: document.title,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    dpr: window.devicePixelRatio,
    scrollY: Math.round(window.scrollY),
  }
}

/**
 * Describe the element under the middle of the selection.
 *
 * The overlay has to leave the layout entirely for the hit test: setting
 * `pointer-events: none` on the host is not enough, because the selection
 * layer inside it sets `pointer-events: auto` and would be hit instead.
 */
function describeTarget(rect: Rect): TargetInfo | undefined {
  const centre = centreOf(rect)
  const host = document.getElementById(HOST_ID)
  const previous = host?.style.display
  if (host) host.style.display = 'none'
  const element = document.elementFromPoint(centre.x, centre.y)
  if (host) host.style.display = previous ?? ''
  if (!element || element.id === HOST_ID) return undefined

  return {
    selector: buildSelector(element),
    tag: element.tagName.toLowerCase(),
    ...(elementText(element) ? { text: elementText(element)! } : {}),
    rect,
  }
}

function viewportCentreRect(): Rect {
  return { x: window.innerWidth / 2 - 170, y: window.innerHeight / 2 - 120, width: 340, height: 240 }
}

/** Anchor the form beside the selection, but never off-screen. */
function placeCard(card: HTMLElement, rect: Rect): void {
  const width = 340
  const estimatedHeight = 260
  const margin = 12

  let left = rect.x
  if (left + width + margin > window.innerWidth) left = window.innerWidth - width - margin
  left = Math.max(margin, left)

  let top = rect.y + rect.height + margin
  if (top + estimatedHeight > window.innerHeight) top = rect.y - estimatedHeight - margin
  top = Math.max(margin, Math.min(top, window.innerHeight - estimatedHeight - margin))

  card.style.left = `${Math.round(left)}px`
  card.style.top = `${Math.round(top)}px`
}

// ---- entry -------------------------------------------------------------

declare global {
  interface Window {
    __vibecheckOverlay?: Overlay
  }
}

export default defineUnlistedScript(() => {
  // Re-running the file (a second Cmd+J) must toggle, not stack a second UI.
  if (window.__vibecheckOverlay) {
    window.dispatchEvent(new CustomEvent(TOGGLE_EVENT))
    return
  }
  const overlay = new Overlay()
  window.__vibecheckOverlay = overlay
  overlay.activate()
})
