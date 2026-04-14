# Amazon Deals Personal Assistant

You are a personal assistant specialized in monitoring Amazon.com Today's Deals. Your job is to:
1. Navigate Amazon's deals page using the browser
2. Extract referral (affiliate) links tied to the user's Amazon Associates account
3. Send those links to the user via their preferred channel
4. Optionally run this workflow on a schedule (start time, interval, max runs)

---

## Project Structure

```
.
├── CLAUDE.md                    # This file
├── package.json
├── tsconfig.json
├── config/
│   └── settings.json            # User config: notify channel, schedule, referral tag
├── src/
│   ├── amazon/
│   │   ├── browser.ts           # Playwright browser session (reuses logged-in profile)
│   │   ├── deals.ts             # Scrape today's deals list
│   │   └── referral.ts          # Inject/extract referral tag into deal URLs
│   ├── notify/
│   │   └── sender.ts            # Send results (console | email | Slack | webhook)
│   └── scheduler/
│       └── index.ts             # Run on schedule: startAt, intervalMinutes, maxRuns
├── scripts/
│   └── run.ts                   # Entry point: node scripts/run.ts
└── .claude/
    └── skills/                  # Playwright CLI skills (already installed)
```

---

## Configuration (`config/settings.json`)

```json
{
  "amazon": {
    "dealsUrl": "https://www.amazon.com/deals",
    "referralTag": "YOUR_ASSOCIATE_TAG-20",
    "maxDeals": 20
  },
  "notify": {
    "channel": "console",
    "email": "",
    "slackWebhook": "",
    "webhookUrl": ""
  },
  "schedule": {
    "startAt": "09:00",
    "intervalMinutes": 30,
    "maxRuns": 5
  }
}
```

---

## How to Use

### Run once (manual)
```bash
npx ts-node scripts/run.ts
```

### Run on schedule
```bash
npx ts-node scripts/run.ts --schedule
```
Reads `startAt`, `intervalMinutes`, and `maxRuns` from `config/settings.json`.

### Override schedule via CLI flags
```bash
npx ts-node scripts/run.ts --schedule --start 10:30 --interval 15 --runs 3
```

---

## Browser & Authentication

- Uses Playwright with a **persistent browser profile** so the user's Amazon session is reused (no re-login needed).
- Profile is stored at `.browser-profile/` (gitignored).
- First run: browser opens visibly so the user can log in and accept cookies. Subsequent runs are headless.
- The referral tag is appended as `?tag=ASSOCIATE_TAG` to each deal URL.

---

## Workflow per Run

1. Launch browser with persistent profile
2. Navigate to `https://www.amazon.com/deals`
3. Scrape deal cards: title, original price, deal price, discount %, deal URL
4. Append referral tag to each URL
5. Format results as a readable list
6. Send via configured `notify.channel`
7. Wait `intervalMinutes` and repeat (if `--schedule` mode, up to `maxRuns` times)

---

## Notify Channels

| Channel     | Config key           | Notes                              |
|-------------|----------------------|------------------------------------|
| `console`   | default              | Print to terminal                  |
| `email`     | `notify.email`       | Requires SMTP env vars             |
| `slack`     | `notify.slackWebhook`| Incoming webhook URL               |
| `webhook`   | `notify.webhookUrl`  | POST JSON payload to any endpoint  |

---

## Environment Variables

```bash
# Required only for email channel
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=yourapppassword
SMTP_TO=you@gmail.com
```

---

## Key Implementation Notes

- Use `playwright-cli` (already installed globally) for browser automation tasks.
- Always reuse the persistent browser profile to avoid re-authentication.
- Referral tag must be set in `config/settings.json` before first run.
- The schedule runs entirely in-process (no external cron needed) using `setTimeout` loops.
- If `maxRuns` is reached, the process exits cleanly.
- All deal data is logged to `logs/YYYY-MM-DD.json` for audit.

---

## Setup Commands

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# First run (opens browser for login)
npx ts-node scripts/run.ts --setup

# Normal run
npx ts-node scripts/run.ts
```

---

## Gitignore Additions

```
.browser-profile/
logs/
config/settings.json   # contains your referral tag — keep private
node_modules/
dist/
```
