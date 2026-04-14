import { chromium, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

const PROFILE_DIR = path.resolve('.browser-profile');

export async function getBrowserContext(headless = true): Promise<BrowserContext> {
  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

  return context;
}

export async function getPage(context: BrowserContext): Promise<Page> {
  const pages = context.pages();
  return pages.length > 0 ? pages[0] : await context.newPage();
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded' });
  const accountText = await page.$('#nav-link-accountList-nav-line-1');
  if (!accountText) return false;
  const text = await accountText.textContent();
  return !!text && !text.toLowerCase().includes('sign in');
}

export async function setupSession(): Promise<void> {
  console.log('\n[SETUP] Opening browser for you to log in to Amazon...');
  console.log('[SETUP] Once logged in, close the browser window and re-run without --setup.\n');

  const context = await getBrowserContext(false);
  const page = await getPage(context);
  await page.goto('https://www.amazon.com/ap/signin', { waitUntil: 'domcontentloaded' });

  // Wait until the user manually closes the browser
  await Promise.race([
    context.waitForEvent('close'),
    page.waitForEvent('close'),
  ]);

  await context.close().catch(() => {});
  console.log('\n[SETUP] Browser closed. Session saved to .browser-profile/');
}
