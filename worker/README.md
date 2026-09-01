# vibecheck-auth

The one thing VibeCheck cannot do inside the browser.

GitHub requires a **client secret** to exchange an OAuth authorization code for
an access token — PKCE does not lift that requirement — and a browser extension
cannot hold a secret. This worker holds it, performs the exchange, and hands the
token straight back to the extension.

It has no storage, no database and no logging. A token passes through it once
and is never written down.

## Endpoints

| Route | Purpose |
| --- | --- |
| `GET /start?ext=<extension id>&state=<nonce>` | Redirects to GitHub's authorization page |
| `GET /callback?code&state` | Exchanges the code and redirects the token back to the extension |
| `GET /health` | Returns `ok` |

`ALLOWED_EXTENSION_IDS` is what keeps this from being an open redirector: the
callback only ever redirects to `https://<allow-listed id>.chromiumapp.org/`.

## Deploying your own

1. Create a GitHub OAuth app (**Settings → Developer settings → OAuth Apps**).
   Set the authorization callback URL to `https://<your worker>/callback`.
2. Configure and deploy:

   ```bash
   cd worker
   pnpm install
   # GITHUB_CLIENT_ID and ALLOWED_EXTENSION_IDS go in wrangler.toml
   pnpm wrangler secret put GITHUB_CLIENT_SECRET
   pnpm run deploy
   ```

3. Point the extension at it: **Settings → GitHub → Advanced → Sign-in endpoint**.

`ALLOWED_EXTENSION_IDS` takes a comma-separated list — typically your unpacked
development id and your Web Store id.
