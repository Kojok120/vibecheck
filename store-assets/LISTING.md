# Chrome Web Store listing

Everything the dashboard asks for. Copy each block into the matching field.

- **Package**: `.output/vibecheck-1.0.0-chrome.zip` (regenerate with `pnpm zip`)
- **Screenshots**: `01-select.png` … `04-setup.png` (1280×800, upload in order)
- **Small promo tile**: `promo-small-440x280.png`
- **Marquee promo tile**: `promo-marquee-1400x560.png` (optional)
- **Category**: Developer Tools
- **Privacy policy URL**: https://kojok120.github.io/vibecheck/privacy.html

---

## English (default locale)

### Name
```
VibeCheck
```

### Short description (132 characters max)
```
Review a page, write the two things you meant to say, and send them to GitHub, Slack, Discord, or a file your agent can read.
```

### Detailed description
```
AI writes the code; a human still has to open the app and look at it. And every time you spot something, the same manual loop starts: take a screenshot, find where it went, write the context, write the fix you want, paste it all somewhere.

VibeCheck collapses that loop into two keystrokes and two fields.

HOW IT WORKS

Press Cmd+J (Ctrl+J) on any page.
  S  — drag a box around the problem, then write it up
  C  — leave a comment without a screenshot
  Esc — done

Every item asks for the same two things: Background (why it came up) and Requested change (what should happen). Items land in the side panel on the right. Tick the ones you want and send them.

WHERE THEY GO

• Copy — every selected screenshot stacked into one tall, numbered image. The operating system clipboard only holds one image, so this is what makes a single paste readable in Slack, Discord, GitHub or Notion.
• Save — a folder of screenshots plus a review.md whose image links are absolute paths, ready to hand to a coding agent.
• GitHub — the issue is written for you; the numbered image goes to your clipboard for a single paste.
• Slack — the write-up and every screenshot as one message.
• Discord — the same, through a webhook.

Send a batch anywhere and those items check themselves off, so the panel keeps showing only what is still outstanding.

BUILT TO BE TRUSTED

VibeCheck does not run on every page. The capture overlay is injected only into the tab you invoked it on, at the moment you invoke it — so there is no "read and change all your data on all websites" prompt, and no content script sitting on your banking tab.

Nothing is uploaded until you press a send button. Screenshots and tokens live on your machine and can be deleted from the options page in one click.

It is open source under the MIT licence: https://github.com/Kojok120/vibecheck

Interface available in English and Japanese.
```

---

## 日本語

### Name
```
VibeCheck
```

### Short description (132 characters max)
```
ページを見て、言うつもりだった2つを書くだけ。GitHub・Slack・Discord・AIが読めるファイルへそのまま送れます。
```

### Detailed description
```
コードはAIが書けても、アプリを開いて目で見るのは人間の仕事です。そして気づくたびに同じ手作業が始まります。スクショを撮る、保存先を探す、背景を書く、直してほしい内容を書く、どこかに貼る。

VibeCheck は、この繰り返しを「2つのキー」と「2つの入力欄」に畳みます。

使い方

任意のページで Cmd+J（Ctrl+J）を押します。
  S  — 直したい箇所をドラッグで囲み、そのまま記入
  C  — スクショなしでコメントだけ残す
  Esc — 終了

どの指摘も同じ2項目だけを聞きます。「背景」（なぜ気づいたか）と「アップデート内容」（どう変えてほしいか）。指摘は右のサイドパネルに積み上がるので、チェックして送るだけです。

送り先

・コピー — 選んだスクショを縦1枚に合成し、番号を焼き込みます。OSのクリップボードは画像を1枚しか保持できないため、これが「1回の貼り付けで対応関係が崩れない」唯一の方法です。
・保存 — スクショ一式と review.md。画像リンクは絶対パスなので、コーディングエージェントにそのまま渡せます。
・GitHub — Issue の本文まで自動作成。番号入り画像はクリップボードに入るので1回貼るだけです。
・Slack — 本文と全スクショを1メッセージで投稿。
・Discord — 同じことを Webhook 経由で。

送信した指摘はその場で消し込まれ、リストには未対応だけが残ります。

安心して使えること

VibeCheck は全ページに常駐しません。キャプチャ用のオーバーレイは、起動したタブにその瞬間だけ注入されます。そのため「すべてのウェブサイトのデータの読み取りと変更」という警告は出ませんし、ネットバンキングのタブに常駐することもありません。

送信ボタンを押すまで、データはどこにも送られません。スクリーンショットとトークンは端末内に保存され、設定画面から一括削除できます。

MIT ライセンスのオープンソースです: https://github.com/Kojok120/vibecheck

日本語と英語に対応しています。
```

---

## Privacy practices tab

### Single purpose
```
VibeCheck collects visual review feedback on a web page — a screenshot of a
selected region plus two short text fields — and exports the collected items to
the destination the user chooses.
```

### Permission justifications

**activeTab**
```
The capture overlay is injected into the current tab only when the user invokes
the extension by keyboard shortcut or toolbar icon. activeTab lets the
extension read that one tab, at that one moment, without requesting access to
every site the user visits.
```

**scripting**
```
Used to inject the capture overlay into the active tab on demand, under the
activeTab grant. The extension declares no content scripts, so it never runs on
a page the user has not explicitly invoked it on.
```

**storage**
```
Stores the collected feedback (the two text fields, the page URL and the CSS
selector) and the user's own destination settings locally.
```

**unlimitedStorage**
```
Screenshots are stored in the extension's IndexedDB. A single review session
easily exceeds the default 10MB quota.
```

**downloads**
```
The "Save" action writes the screenshots and a review.md file to the user's
Downloads folder.
```

**sidePanel**
```
The collected feedback is listed and edited in the side panel.
```

**clipboardWrite**
```
The "Copy" action places a composed image or Markdown on the clipboard.
Rendering the image can outlast the click's transient user activation, so the
permission is required.
```

**identity**
```
Used for chrome.identity.launchWebAuthFlow so the user can authorize the
extension with GitHub in a single click, rather than pasting a personal access
token.
```

**Host permission: https://api.github.com/***
```
Creates the GitHub issue the user asked for, when they press Send.
```

**Host permissions: https://slack.com/api/*, https://files.slack.com/***
```
Posts the write-up and the selected screenshots to the Slack channel the user
chose, when they press Send.
```

**Host permissions: https://discord.com/api/webhooks/*, https://discordapp.com/api/webhooks/***
```
Posts the write-up and the selected screenshots to the Discord webhook the user
supplied, when they press Send.
```

### Remote code
```
No. All code is contained in the package. Nothing is fetched and executed at
runtime.
```

### Data usage disclosures
Tick, and confirm the three certification checkboxes:

- **Website content** — the screenshot and page URL the user selects.
- **Authentication information** — the GitHub token, Slack token and Discord
  webhook the user provides, stored locally and sent only to those services.

Nothing else. Not sold, not used for anything unrelated, not used for
creditworthiness.
