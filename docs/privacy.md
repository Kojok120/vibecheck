---
title: VibeCheck Privacy Policy
---

# VibeCheck Privacy Policy

_Last updated: 1 September 2026_

VibeCheck is an open-source browser extension for collecting review feedback on
web pages. The source is at
[github.com/Kojok120/vibecheck](https://github.com/Kojok120/vibecheck).

## The short version

VibeCheck has no backend, no analytics and no accounts. Everything it captures
stays on your computer until you press a button that sends it somewhere, and
then it goes only to the destination you chose.

## What VibeCheck stores, and where

Everything below is stored **locally, in your browser**, using
`chrome.storage.local` and the extension's own IndexedDB:

- The screenshots you take
- The text you write in the Background and Requested change fields
- The URL, page title, viewport size and CSS selector of what you selected
- Your Slack bot token, Discord webhook URLs, and your GitHub access token

None of this is transmitted to the extension's author, and there is no server
that receives it. You can delete all of it at any time from
**Settings → Data → Delete all feedback and tokens**.

## What leaves your computer, and when

Only when you press a send button, and only to the service that button names:

| You press | What is sent | Where |
| --- | --- | --- |
| **GitHub → Send** | The issue title and body you can see in the panel | `api.github.com` |
| **Slack → Send** | The write-up and the selected screenshots | `slack.com`, `files.slack.com` |
| **Discord → Send** | The write-up and the selected screenshots | the webhook URL you supplied |
| **Save** | Files written to your own Downloads folder | nowhere |
| **Copy** | Content placed on your own clipboard | nowhere |

**Copy and Save never make a network request at all.**

## Signing in to GitHub

Connecting GitHub sends you to GitHub's own authorization page. GitHub requires
a client secret to turn the resulting authorization code into an access token,
and a browser extension cannot hold a secret — so a small worker
(`worker/` in the repository) performs that one exchange.

The worker receives the authorization code, exchanges it with GitHub, and
returns the token to the extension. **It has no database and writes no logs.**
Its full source is in the repository, and you may run your own copy and point
the extension at it from **Settings → GitHub → Advanced**.

## What VibeCheck can read

The capture overlay is injected only into the tab where you invoked it, only at
the moment you invoke it, using the `activeTab` permission. VibeCheck does not
run on pages you have not explicitly pointed it at, and it does not read your
browsing history, your bookmarks, your cookies or your saved passwords.

## Third parties

When you send feedback to GitHub, Slack or Discord, that data is then handled
under **their** privacy policies. VibeCheck neither sells nor shares data with
anyone else, and there are no advertising, analytics or tracking services in
the extension.

## Children

VibeCheck is a developer tool and is not directed at children.

## Changes

Material changes to this policy will be published on this page and in the
repository's history.

## Contact

Open an issue at
[github.com/Kojok120/vibecheck/issues](https://github.com/Kojok120/vibecheck/issues).
