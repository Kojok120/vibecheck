import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  publicDir: 'src/public',
  outDir: '.output',
  manifest: {
    name: 'VibeCheck',
    // `sidePanel.open()` landed in Chrome 116.
    minimum_chrome_version: '116',
    short_name: 'VibeCheck',
    description:
      'Capture UI feedback while you review, then ship it to GitHub Issues, Slack, or Discord.',
    // No declarative content_scripts: the overlay is injected on demand with
    // `activeTab`, so the extension never asks for all-sites access.
    permissions: [
      'activeTab',
      'scripting',
      'storage',
      'unlimitedStorage',
      'downloads',
      'sidePanel',
      // Lets the side panel put a rendered contact sheet on the clipboard even
      // when sheet rendering outlives the click's transient activation.
      'clipboardWrite',
    ],
    host_permissions: [
      'https://api.github.com/*',
      // Device flow only; nothing else on github.com is fetched.
      'https://github.com/login/*',
      'https://slack.com/api/*',
      'https://files.slack.com/*',
      'https://discord.com/api/webhooks/*',
      'https://discordapp.com/api/webhooks/*',
    ],
    commands: {
      'toggle-vibecheck': {
        suggested_key: { default: 'Ctrl+J', mac: 'Command+J' },
        description: 'Start capturing feedback on the current page',
      },
    },
    action: { default_title: 'VibeCheck' },
    side_panel: { default_path: 'sidepanel.html' },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
})
