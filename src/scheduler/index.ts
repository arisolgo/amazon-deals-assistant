export interface ScheduleOptions {
  startAt: string;       // "HH:MM" 24h format, e.g. "09:00"
  intervalMinutes: number;
  maxRuns: number;
}

type JobFn = () => Promise<void>;

/**
 * Runs `job` starting at `startAt`, then every `intervalMinutes`,
 * stopping after `maxRuns` total executions.
 */
export async function runScheduled(job: JobFn, opts: ScheduleOptions): Promise<void> {
  const { startAt, intervalMinutes, maxRuns } = opts;

  const msUntilStart = getMsUntilTime(startAt);
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(
    `[SCHEDULER] Waiting until ${startAt} to start` +
      ` (${formatMs(msUntilStart)} from now).` +
      ` Will run ${maxRuns}x every ${intervalMinutes} min.`
  );

  await sleep(msUntilStart);

  let runs = 0;
  while (runs < maxRuns) {
    runs++;
    console.log(`\n[SCHEDULER] Run ${runs}/${maxRuns} — ${new Date().toLocaleTimeString()}`);

    try {
      await job();
    } catch (err) {
      console.error(`[SCHEDULER] Job failed on run ${runs}:`, err);
    }

    if (runs < maxRuns) {
      console.log(`[SCHEDULER] Next run in ${intervalMinutes} min...`);
      await sleep(intervalMs);
    }
  }

  console.log(`\n[SCHEDULER] All ${maxRuns} runs completed. Exiting.`);
}

/**
 * Returns milliseconds until the next occurrence of `timeStr` (HH:MM).
 * If the time has already passed today, it targets tomorrow.
 */
function getMsUntilTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', `${s}s`].filter(Boolean).join(' ');
}
