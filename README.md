# Amazon Deals Personal Assistant

Monitors Amazon Today's Deals, appends your Amazon Associates referral tag to each deal URL, and delivers them via your preferred channel (console, email, Slack, or webhook). Supports one-shot runs and scheduled execution.

---

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- [npm](https://www.npmjs.com/) v9 or later
- An [Amazon Associates](https://affiliate-program.amazon.com/) account with a referral tag

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/arielsolano/amazon-deals-assistant.git
cd amazon-deals-assistant
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install Playwright's Chromium browser

```bash
npx playwright install chromium
```

---

## Configuration

### 4. Create your `.env` file

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Then open `.env` and set your variables:

```env
# ── Amazon ─────────────────────────────────────
AMAZON_DEALS_URL=https://www.amazon.com/deals
AMAZON_REFERRAL_TAG=your-tag-20        # <-- your Associates tag
AMAZON_MAX_DEALS=20                    # max deals to scrape per run

# ── Notify channel: console | email | slack | webhook ──
NOTIFY_CHANNEL=console
NOTIFY_EMAIL=                          # required if NOTIFY_CHANNEL=email
NOTIFY_SLACK_WEBHOOK=                  # required if NOTIFY_CHANNEL=slack
NOTIFY_WEBHOOK_URL=                    # required if NOTIFY_CHANNEL=webhook

# ── Schedule ───────────────────────────────────
SCHEDULE_START_AT=09:00                # 24h HH:MM
SCHEDULE_INTERVAL_MINUTES=30
SCHEDULE_MAX_RUNS=5

# ── Email / SMTP (only for email channel) ──────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=yourapppassword
SMTP_TO=you@gmail.com
```

> **Important:** `.env` is gitignored. Never commit it — it contains your private referral tag and credentials.

---

## First Run (Browser Login)

### 5. Log in to Amazon

The assistant uses a persistent browser profile so it never asks you to log in again. On the first run, the browser opens visibly for you to authenticate:

```bash
npx ts-node scripts/run.ts --setup
```

1. A Chromium window opens and navigates to Amazon's sign-in page.
2. Log in with your Amazon account normally.
3. Once logged in, **close the browser window**.
4. The session is saved to `.browser-profile/` (gitignored).

> You only need to do this once. All future runs reuse the saved session.

---

## Running the Assistant

### Run once (manual)

```bash
npx ts-node scripts/run.ts
```

Or using the npm script:

```bash
npm start
```

This scrapes today's deals, appends your referral tag to each URL, and sends the report via the channel configured in `.env`.

---

### Run on a schedule

```bash
npx ts-node scripts/run.ts --schedule
```

Or:

```bash
npm run schedule
```

Reads `SCHEDULE_START_AT`, `SCHEDULE_INTERVAL_MINUTES`, and `SCHEDULE_MAX_RUNS` from `.env`. The process waits until `startAt`, runs the job, then repeats every `intervalMinutes` until `maxRuns` is reached.

**Example:** start at 09:00, every 30 min, 5 times total → finishes at ~11:00.

---

### Override schedule via CLI flags

```bash
npx ts-node scripts/run.ts --schedule --start 10:30 --interval 15 --runs 3
```

| Flag | Description | Default (from `.env`) |
|---|---|---|
| `--start HH:MM` | When to start the first run | `SCHEDULE_START_AT` |
| `--interval N` | Minutes between runs | `SCHEDULE_INTERVAL_MINUTES` |
| `--runs N` | Total number of runs | `SCHEDULE_MAX_RUNS` |

---

## Notify Channels

| Channel | `.env` variable | What to set |
|---|---|---|
| `console` | — | Default. Prints to terminal. |
| `email` | `NOTIFY_EMAIL` + SMTP vars | Your destination email address |
| `slack` | `NOTIFY_SLACK_WEBHOOK` | Slack Incoming Webhook URL |
| `webhook` | `NOTIFY_WEBHOOK_URL` | Any HTTPS endpoint (receives JSON) |

### Email setup (Gmail)

1. Enable [2-Step Verification](https://myaccount.google.com/security) on your Google account.
2. Create an [App Password](https://myaccount.google.com/apppasswords) for "Mail".
3. Set in `.env`:
   ```env
   NOTIFY_CHANNEL=email
   SMTP_USER=you@gmail.com
   SMTP_PASS=xxxx-xxxx-xxxx-xxxx   # the App Password
   SMTP_TO=recipient@example.com
   ```

### Slack setup

1. Create an [Incoming Webhook](https://api.slack.com/messaging/webhooks) in your Slack workspace.
2. Set in `.env`:
   ```env
   NOTIFY_CHANNEL=slack
   NOTIFY_SLACK_WEBHOOK=https://hooks.slack.com/services/...
   ```

---

## Output & Logs

Every run appends a report to `logs/YYYY-MM-DD.txt` (gitignored). Example output:

```
═══════════════════════════════════════════════
  Amazon Today's Deals — 4/13/2026, 9:00:00 AM
  Referral tag: your-tag-20
  Total deals : 20
═══════════════════════════════════════════════

[1] Sony WH-1000XM5 Wireless Headphones
    Badge   : Lightning Deal
    Price   : $279.99
    Was     : $349.99
    Discount: 20% off
    Rating  : 4.6 out of 5 stars
    Link    : https://www.amazon.com/dp/B09XS7JWHH?tag=your-tag-20
```

---

## Project Structure

```
.
├── .env.example             # Config template — copy to .env
├── .env                     # Your local config (gitignored)
├── CLAUDE.md                # Claude Code assistant instructions
├── README.md                # This file
├── package.json
├── tsconfig.json
├── config/
│   └── settings.json        # Legacy config (ignored by git)
├── src/
│   ├── amazon/
│   │   ├── browser.ts       # Playwright persistent browser session
│   │   ├── deals.ts         # Scrape Today's Deals
│   │   └── referral.ts      # Inject referral tag into URLs
│   ├── notify/
│   │   └── sender.ts        # Deliver report (console/email/slack/webhook)
│   └── scheduler/
│       └── index.ts         # Scheduled execution loop
├── scripts/
│   └── run.ts               # Entry point
└── logs/                    # Run logs — YYYY-MM-DD.txt (gitignored)
```

---

## Troubleshooting

**"Not logged in to Amazon"**
Run `npx ts-node scripts/run.ts --setup` again. Your session may have expired.

**"Deal card selector not found"**
Amazon may have updated its page layout. Open an issue with a screenshot of the current deals page.

**Email not sending**
Make sure you're using a Gmail [App Password](https://myaccount.google.com/apppasswords), not your regular password. Regular passwords are blocked by Google.

**TypeScript errors on run**
Make sure you're running Node.js v18+ and have run `npm install`.

---

## License

MIT
