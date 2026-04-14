import { Page } from 'playwright';

export interface Deal {
  title: string;
  originalPrice: string;
  dealPrice: string;
  discount: string;
  rating: string;
  dealUrl: string;
  imageUrl: string;
  badge: string;
}

export async function scrapeDeals(page: Page, dealsUrl: string, maxDeals: number): Promise<Deal[]> {
  console.log(`[DEALS] Navigating to ${dealsUrl}`);
  await page.goto(dealsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for deal cards to appear
  await page.waitForSelector('[data-testid="deal-card"], .DealCard, [class*="DealCard"]', {
    timeout: 15000,
  }).catch(() => {
    console.warn('[DEALS] Deal card selector not found — Amazon may have updated its layout.');
  });

  // Scroll to load more deals
  await autoScroll(page, 3);

  const deals: Deal[] = await page.evaluate((max) => {
    const results: {
      title: string;
      originalPrice: string;
      dealPrice: string;
      discount: string;
      rating: string;
      dealUrl: string;
      imageUrl: string;
      badge: string;
    }[] = [];

    // Try multiple selectors for resilience
    const cardSelectors = [
      '[data-testid="deal-card"]',
      '.DealCard',
      '[class*="DealCard"]',
      '[data-component-type="s-search-result"]',
    ];

    let cards: NodeListOf<Element> | Element[] | null = null;
    for (const sel of cardSelectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) {
        cards = found;
        break;
      }
    }

    if (!cards) return results;

    const getText = (el: Element, selector: string): string => {
      const node = el.querySelector(selector);
      return node?.textContent?.trim() ?? '';
    };

    const getAttr = (el: Element, selector: string, attr: string): string => {
      const node = el.querySelector(selector);
      return (node as HTMLElement)?.getAttribute(attr) ?? '';
    };

    Array.from(cards)
      .slice(0, max)
      .forEach((card) => {
        // Title
        const title =
          getText(card, '[data-testid="deal-title"]') ||
          getText(card, '.a-size-base-plus') ||
          getText(card, '.a-size-medium') ||
          getText(card, 'span[class*="title"]') ||
          '';

        // Prices
        const dealPrice =
          getText(card, '[data-testid="deal-price"]') ||
          getText(card, '.a-price .a-offscreen') ||
          getText(card, '[class*="dealPrice"]') ||
          '';

        const originalPrice =
          getText(card, '[data-testid="original-price"]') ||
          getText(card, '.a-text-strike') ||
          getText(card, '[class*="originalPrice"]') ||
          '';

        const discount =
          getText(card, '[data-testid="deal-badge"]') ||
          getText(card, '.a-badge-text') ||
          getText(card, '[class*="discount"]') ||
          '';

        // Rating
        const rating =
          getAttr(card, '[class*="star"]', 'aria-label') ||
          getText(card, '.a-icon-alt') ||
          '';

        // URL
        const anchor =
          card.querySelector('a[href*="/dp/"]') ||
          card.querySelector('a[href*="/deal/"]') ||
          card.querySelector('a');
        const href = (anchor as HTMLAnchorElement)?.href ?? '';
        const dealUrl = href.startsWith('http')
          ? href
          : href
          ? `https://www.amazon.com${href}`
          : '';

        // Image
        const imageUrl = getAttr(card, 'img', 'src') || getAttr(card, 'img', 'data-src') || '';

        // Badge (Lightning Deal, Limited time deal, etc.)
        const badge =
          getText(card, '[class*="badgeLabel"]') ||
          getText(card, '.a-badge-label') ||
          '';

        if (title || dealUrl) {
          results.push({ title, originalPrice, dealPrice, discount, rating, dealUrl, imageUrl, badge });
        }
      });

    return results;
  }, maxDeals);

  console.log(`[DEALS] Found ${deals.length} deals`);
  return deals;
}

async function autoScroll(page: Page, times: number): Promise<void> {
  for (let i = 0; i < times; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await page.waitForTimeout(800);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}
