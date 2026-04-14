import { Deal } from './deals';

/**
 * Appends the referral tag to an Amazon URL.
 * Handles /dp/, /deal/, and generic Amazon URLs.
 */
export function buildReferralUrl(rawUrl: string, tag: string): string {
  if (!rawUrl) return '';

  try {
    const url = new URL(rawUrl);

    // Remove existing tag if present to avoid duplication
    url.searchParams.delete('tag');
    url.searchParams.set('tag', tag);

    // Clean up tracking noise while keeping the tag
    const keepers = new Set(['tag', 'th', 'psc']);
    for (const key of Array.from(url.searchParams.keys())) {
      if (!keepers.has(key)) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    // If URL parsing fails, do a simple string append
    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}tag=${tag}`;
  }
}

/**
 * Applies referral tags to an array of deals.
 */
export function applyReferralTag(deals: Deal[], tag: string): Deal[] {
  return deals.map((deal) => ({
    ...deal,
    dealUrl: buildReferralUrl(deal.dealUrl, tag),
  }));
}

/**
 * Formats a single deal as a readable string with referral link.
 */
export function formatDeal(deal: Deal, index: number): string {
  const lines: string[] = [];
  lines.push(`[${index + 1}] ${deal.title || '(No title)'}`);

  if (deal.badge) lines.push(`    Badge   : ${deal.badge}`);
  if (deal.dealPrice) lines.push(`    Price   : ${deal.dealPrice}`);
  if (deal.originalPrice) lines.push(`    Was     : ${deal.originalPrice}`);
  if (deal.discount) lines.push(`    Discount: ${deal.discount}`);
  if (deal.rating) lines.push(`    Rating  : ${deal.rating}`);
  if (deal.dealUrl) lines.push(`    Link    : ${deal.dealUrl}`);

  return lines.join('\n');
}

/**
 * Formats all deals as a single string report.
 */
export function formatReport(deals: Deal[], tag: string): string {
  const header = [
    '═══════════════════════════════════════════════',
    `  Amazon Today's Deals — ${new Date().toLocaleString()}`,
    `  Referral tag: ${tag}`,
    `  Total deals : ${deals.length}`,
    '═══════════════════════════════════════════════',
    '',
  ].join('\n');

  const body = deals.map((d, i) => formatDeal(d, i)).join('\n\n');

  return header + body + '\n';
}
