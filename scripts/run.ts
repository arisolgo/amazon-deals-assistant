import 'dotenv/config';
import { getBrowserContext, getPage, isLoggedIn, setupSession } from '../src/amazon/browser';
import { scrapeDeals } from '../src/amazon/deals';
import { applyReferralTag, formatReport } from '../src/amazon/referral';
import { sendReport, NotifyChannel } from '../src/notify/sender';
import { runScheduled } from '../src/scheduler/index';

// ── Config from .env ──────────────────────────────────────────────────────────

const DEALS_URL        = process.env.AMAZON_DEALS_URL        ?? 'https://www.amazon.com/deals';
const REFERRAL_TAG     = process.env.AMAZON_REFERRAL_TAG     ?? '';
const MAX_DEALS        = Number(process.env.AMAZON_MAX_DEALS  ?? 20);
const NOTIFY_CHANNEL   = (process.env.NOTIFY_CHANNEL         ?? 'console') as NotifyChannel;
const NOTIFY_EMAIL     = process.env.NOTIFY_EMAIL            ?? '';
const NOTIFY_SLACK     = process.env.NOTIFY_SLACK_WEBHOOK    ?? '';
const NOTIFY_WEBHOOK   = process.env.NOTIFY_WEBHOOK_URL      ?? '';

// ── Parse CLI args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const hasFlag = (flag: string) => args.includes(flag);
const getArg  = (flag: string): string | undefined => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
};

const isSetup    = hasFlag('--setup');
const isSchedule = hasFlag('--schedule');

const startAt         = getArg('--start')    ?? (process.env.SCHEDULE_START_AT         ?? '09:00');
const intervalMinutes = Number(getArg('--interval') ?? (process.env.SCHEDULE_INTERVAL_MINUTES ?? 30));
const maxRuns         = Number(getArg('--runs')     ?? (process.env.SCHEDULE_MAX_RUNS         ?? 5));

// ── Main job ──────────────────────────────────────────────────────────────────

async function job(): Promise<void> {
  const context = await getBrowserContext(true);
  const page    = await getPage(context);

  try {
    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      console.warn(
        '[WARN] Not logged in to Amazon. Run with --setup first, or check your .browser-profile/'
      );
    }

    const rawDeals = await scrapeDeals(page, DEALS_URL, MAX_DEALS);
    const deals    = applyReferralTag(rawDeals, REFERRAL_TAG);
    const report   = formatReport(deals, REFERRAL_TAG);

    await sendReport(report, {
      channel:      NOTIFY_CHANNEL,
      email:        NOTIFY_EMAIL,
      slackWebhook: NOTIFY_SLACK,
      webhookUrl:   NOTIFY_WEBHOOK,
    });
  } finally {
    await context.close();
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (isSetup) {
    await setupSession();
    return;
  }

  if (isSchedule) {
    await runScheduled(job, { startAt, intervalMinutes, maxRuns });
  } else {
    await job();
  }
}

main().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
