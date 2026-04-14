import fs from 'fs';
import path from 'path';
import axios from 'axios';
import nodemailer from 'nodemailer';

export type NotifyChannel = 'console' | 'email' | 'slack' | 'webhook';

export interface NotifyConfig {
  channel: NotifyChannel;
  email?: string;
  slackWebhook?: string;
  webhookUrl?: string;
}

export async function sendReport(report: string, config: NotifyConfig): Promise<void> {
  saveLog(report);

  switch (config.channel) {
    case 'console':
      await sendConsole(report);
      break;
    case 'email':
      await sendEmail(report, config.email ?? '');
      break;
    case 'slack':
      await sendSlack(report, config.slackWebhook ?? '');
      break;
    case 'webhook':
      await sendWebhook(report, config.webhookUrl ?? '');
      break;
    default:
      await sendConsole(report);
  }
}

// ── Console ──────────────────────────────────────────────────────────────────

async function sendConsole(report: string): Promise<void> {
  console.log('\n' + report);
}

// ── Email ─────────────────────────────────────────────────────────────────────

async function sendEmail(report: string, to: string): Promise<void> {
  if (!to) throw new Error('[EMAIL] NOTIFY_EMAIL is not set in your .env file');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: `Amazon Today's Deals — ${new Date().toLocaleDateString()}`,
    text: report,
    html: `<pre style="font-family:monospace;font-size:13px">${escapeHtml(report)}</pre>`,
  });

  console.log(`[EMAIL] Report sent to ${to}`);
}

// ── Slack ─────────────────────────────────────────────────────────────────────

async function sendSlack(report: string, webhookUrl: string): Promise<void> {
  if (!webhookUrl) throw new Error('[SLACK] NOTIFY_SLACK_WEBHOOK is not set in your .env file');

  await axios.post(webhookUrl, {
    text: `*Amazon Today's Deals — ${new Date().toLocaleString()}*\n\`\`\`${report}\`\`\``,
  });

  console.log('[SLACK] Report sent to Slack channel');
}

// ── Generic Webhook ───────────────────────────────────────────────────────────

async function sendWebhook(report: string, url: string): Promise<void> {
  if (!url) throw new Error('[WEBHOOK] NOTIFY_WEBHOOK_URL is not set in your .env file');

  await axios.post(url, {
    timestamp: new Date().toISOString(),
    report,
  });

  console.log(`[WEBHOOK] Report sent to ${url}`);
}

// ── Local log ─────────────────────────────────────────────────────────────────

function saveLog(report: string): void {
  const logsDir = path.resolve('logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const logFile = path.join(logsDir, `${date}.txt`);

  fs.appendFileSync(logFile, report + '\n' + '─'.repeat(50) + '\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
