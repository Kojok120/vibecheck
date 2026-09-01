<div align="center">

<img src="assets/icon-preview.png" width="88" alt="">

# VibeCheck

**Review a web app, capture what needs fixing, and ship it as a GitHub issue, a Slack post, a Discord message, or a Markdown file your coding agent can read.**

[日本語 README](README.ja.md) · MIT · Chrome (Manifest V3)

</div>

---

## Why

AI writes the code; a human still has to open the app and look at it. Every finding turns into the same manual loop — take a screenshot, find where it went, write the context, write the requested change, paste it all somewhere.

VibeCheck collapses that loop into two keystrokes and two fields.

## How it works

<table>
<tr>
<td width="52%"><img src="assets/screenshot-capture.png" alt="Selecting a region and writing it up"></td>
<td width="48%"><img src="assets/screenshot-panel.png" alt="The side panel collecting feedback"></td>
</tr>
<tr>
<td align="center"><sub>Drag, then write the two things you were going to say anyway</sub></td>
<td align="center"><sub>Findings stack up on the right, ready to send</sub></td>
</tr>
</table>

```
Cmd+J (Ctrl+J)   start capturing on the current page
  S              drag a box → screenshot → write it up
  C              comment only, no screenshot
  Esc            done
```

Every item asks for the same two things — **Background** (why it came up) and **Requested change** (what should happen) — and lands in the side panel on the right. Tick the ones you want, then send them anywhere:

| Destination | What you get |
| --- | --- |
| **Copy** | One tall PNG with every screenshot stacked and **numbered**, so a single paste stays readable in Slack, Discord, GitHub or Notion |
| **Save** | A folder of screenshots plus a `review.md` whose image links are absolute paths — paste it straight into Claude Code |
| **GitHub** | One issue, screenshots committed to a dedicated branch and referenced from the body |
| **Slack** | The write-up and every screenshot as a single message |
| **Discord** | Same, via a webhook |

### About "copy several screenshots at once"

The operating system clipboard holds exactly **one** image. That is not a Slack or a browser limitation — no tool can put five screenshots on the clipboard at once.

So VibeCheck composes them into one image instead. Each screenshot carries the number its text block uses, which is what makes a single paste legible:

<img src="assets/sheet-example.png" width="520" alt="Numbered contact sheet">

## Install

Not on the Chrome Web Store yet. Build and load it unpacked:

```bash
pnpm install
pnpm build
```

Then open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select `.output/chrome-mv3`.

Check `chrome://extensions/shortcuts` afterwards. On macOS `Cmd+J` is Chrome's own Downloads shortcut, so if VibeCheck did not get it, assign a free combination there — the extension tells you when nothing is bound.

## Setup

Copy and Save need no configuration. The three destinations below each need one credential.

<a id="setup"></a>

### GitHub

1. Create an OAuth app at **Settings → Developer settings → OAuth Apps → New OAuth App**. Any homepage and callback URL will do.
2. **Tick "Enable Device Flow".** Without it, sign-in cannot complete.
3. Copy the **Client ID** into VibeCheck's options page.
4. Press **Connect**, enter the code GitHub shows you, and you are done.

There is no client secret and no server: VibeCheck uses the OAuth device flow, which is the only grant a client-side app can finish on its own.

Screenshots are committed to a dedicated branch (`vibecheck-assets` by default) and referenced from the issue body, because the GitHub API has no endpoint for attaching an image to an issue.

> **Private repositories:** GitHub's image proxy cannot read a private repository's raw URLs, so screenshots become links rather than inline images. VibeCheck copies the numbered image to your clipboard and opens the new issue, so one `Cmd+V` puts the pictures in.

### Slack

1. Create an app at [api.slack.com/apps](https://api.slack.com/apps) → **From scratch**.
2. Under **OAuth & Permissions**, add the bot scopes `chat:write`, `files:write`, `channels:read`, `groups:read`.
3. Install it to the workspace and copy the **Bot User OAuth Token** (`xoxb-…`) into the options page.
4. Invite the bot to the channel you want to post in.

Incoming webhooks cannot upload files, which is why Slack needs a bot token.

### Discord

**Server Settings → Integrations → Webhooks → New Webhook**, copy the URL, paste it into the options page. That is all.

## Permissions

VibeCheck asks for as little as it can, and the reason for each is worth knowing before you trust a tool with your screen:

| Permission | Why |
| --- | --- |
| `activeTab`, `scripting` | The capture overlay is injected **only** into the tab you invoked it on. There is no content script running on every page, and no "read and change all your data on all websites" prompt. |
| `storage`, `unlimitedStorage` | Feedback lives in `chrome.storage.local`; screenshots live in the extension's own IndexedDB. |
| `downloads` | The Save action. |
| `sidePanel`, `clipboardWrite` | The panel, and the numbered-image copy. |
| Host access to `api.github.com`, `github.com`, `slack.com`, `discord.com` | Only the four services above, only when you send something. |

Nothing is uploaded anywhere until you press a send button. Tokens are stored in `chrome.storage.local` on your machine and can be revoked from the options page.

## Development

```bash
pnpm dev      # watch build; load .output/chrome-mv3-dev as an unpacked extension
pnpm test     # unit tests for the pure logic
pnpm compile  # type check
pnpm build    # production build
pnpm e2e      # drive a real Chrome end to end (see e2e/README.md)
```

Layout:

```
src/core/        pure functions — Markdown, issue bodies, cropping, selectors, sheet layout
src/services/    Chrome, IndexedDB, GitHub, Slack, Discord
src/ui/          shared React pieces and the export orchestration
src/entrypoints/ background worker, injected overlay, side panel, options page
```

Domain logic stays in `src/core` behind pure functions with tests; anything that touches the browser or the network stays in `src/services`. New behaviour that can be expressed as a pure function belongs in `core`, with a test.

Icons are generated: `python3 scripts/make-icons.py`.

## License

MIT
