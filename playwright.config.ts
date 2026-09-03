import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    // Astro 7 auto-detects agentic coding environments (e.g. Claude Code) and
    // silently daemonizes `astro dev`, exiting the foreground process once the
    // background server is up. That breaks Playwright's webServer, which needs
    // the spawned process to stay alive. This opts back into foreground mode.
    env: { ASTRO_DEV_BACKGROUND: '1' },
  },
});
