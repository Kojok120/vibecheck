# End-to-end check

Loads the built extension into a real Chrome and drives the capture flow the
way a reviewer would: inject the overlay, press `S`, drag a box, fill in both
fields, then assert on what actually reached IndexedDB, `chrome.storage`, the
side panel, and the saved `review.md`.

```bash
pnpm build
pnpm e2e            # headless
pnpm e2e -- --headed  # watch it happen
```

No packages: Node's built-in `fetch` and `WebSocket` speak just enough of the
DevTools protocol. Set `CHROME` if your Chrome is not in the usual place.

Two things differ from a real install, both unavoidable in a harness:

- **`<all_urls>` is added to a temporary copy of the build.** The shipped
  manifest relies on `activeTab`, which only a real keyboard command can grant.
- **The overlay is injected by calling `scripting.executeScript` directly**,
  rather than by pressing the shortcut, because extension commands are handled
  by the browser and cannot be synthesised over CDP.

Everything downstream of that — capture, cropping, storage, the panel, the
export — is the real code path.

This harness has already earned its keep: it caught a capture that hung forever
when `requestAnimationFrame` was throttled, a selector that was always empty
because the overlay hit-tested itself, and a capture that could photograph the
wrong tab.
