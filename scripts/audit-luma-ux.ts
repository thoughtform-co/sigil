/**
 * Luma UX audit — persistent browser research script.
 *
 * Opens a visible Chrome window at lu.ma, pauses for manual login,
 * then captures screenshots and DOM snapshots of the key surfaces
 * we want to replicate in Sigil's workshop registration module.
 *
 * Usage:
 *   npx tsx scripts/audit-luma-ux.ts
 *   npx tsx scripts/audit-luma-ux.ts --login-pause=180000
 *   npx tsx scripts/audit-luma-ux.ts --no-login-pause
 *
 * Output lands in:
 *   scripts/luma-audit/  (screenshots + notes.json)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const NO_LOGIN_PAUSE = process.argv.includes('--no-login-pause');
const PAUSE_ARG = process.argv.find((a) => a.startsWith('--login-pause='))?.slice(14);
const LOGIN_PAUSE_MS = NO_LOGIN_PAUSE ? 0 : (PAUSE_ARG ? Number(PAUSE_ARG) : 120_000);

const PROFILES_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'sigil-research', 'browser_profiles');
const OUTPUT_DIR = path.join(__dirname, 'luma-audit');

interface AuditNote {
  timestamp: string;
  page: string;
  url: string;
  screenshot: string;
  title: string;
  description: string;
  elements?: Record<string, string>;
}

const notes: AuditNote[] = [];

function log(event: string, data?: Record<string, unknown>): void {
  const ts = new Date().toISOString().slice(11, 23);
  const extra = data ? ' ' + JSON.stringify(data) : '';
  console.log(`[${ts}] ${event}${extra}`);
}

async function captureSnapshot(
  page: import('playwright').Page,
  name: string,
  description: string,
  fullPage = true,
): Promise<void> {
  const screenshotName = `${String(notes.length + 1).padStart(2, '0')}-${name}.png`;
  const screenshotPath = path.join(OUTPUT_DIR, screenshotName);

  await page.screenshot({ path: screenshotPath, fullPage }).catch(() => {});

  const title = await page.title().catch(() => '');
  const url = page.url();

  notes.push({
    timestamp: new Date().toISOString(),
    page: name,
    url,
    screenshot: screenshotName,
    title,
    description,
  });

  log('captured', { name, url, screenshot: screenshotName });
}

async function waitForStable(page: import('playwright').Page, timeoutMs = 10_000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(async () => {
    await page.waitForTimeout(3000);
  });
}

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  Luma UX Audit — Persistent Browser Session  ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  fs.mkdirSync(PROFILES_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const { chromium } = await import('playwright');
  const userData = path.join(PROFILES_DIR, 'luma_audit');
  fs.mkdirSync(userData, { recursive: true });

  log('launching_browser', { profile: userData });

  const context = await chromium.launchPersistentContext(userData, {
    headless: false,
    viewport: null,
    args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
    channel: 'chrome',
  });

  const existing = context.pages();
  const page = existing.length > 0 ? existing[0]! : await context.newPage();
  page.setDefaultTimeout(60_000);

  // ─── Step 1: Navigate to Luma and pause for login ────────────────
  log('navigating', { url: 'https://lu.ma' });
  await page.goto('https://lu.ma', { waitUntil: 'domcontentloaded' });
  await waitForStable(page);

  await captureSnapshot(page, 'luma-homepage', 'Luma homepage before login');

  if (LOGIN_PAUSE_MS > 0) {
    console.log('\n┌──────────────────────────────────────────────┐');
    console.log('│  LOG IN to Luma now in the browser window.    │');
    console.log('│  Make sure you end up on your Luma dashboard. │');
    console.log(`│  Automation resumes in ${Math.round(LOGIN_PAUSE_MS / 1000)}s.${' '.repeat(Math.max(0, 18 - String(Math.round(LOGIN_PAUSE_MS / 1000)).length))}│`);
    console.log('└──────────────────────────────────────────────┘\n');
    await new Promise((r) => setTimeout(r, LOGIN_PAUSE_MS));
    log('login_pause_done');
  }

  await captureSnapshot(page, 'post-login-state', 'State after login pause — should be dashboard or home');

  // ─── Step 2: Explore the Discover page (public events) ──────────
  log('navigating', { url: 'https://lu.ma/discover' });
  await page.goto('https://lu.ma/discover', { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await captureSnapshot(page, 'discover-page', 'Public discover/browse page — category layout and event cards');

  // ─── Step 3: Find and capture a public event page ────────────────
  log('navigating', { url: 'https://lu.ma/central-park-meetup' });
  await page.goto('https://lu.ma/central-park-meetup', { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await captureSnapshot(page, 'public-event-page', 'Example public event page — hero, details, host, registration CTA');

  // ─── Step 4: Capture the host/organizer dashboard ────────────────
  log('navigating_to_dashboard');
  await page.goto('https://lu.ma/home', { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await captureSnapshot(page, 'organizer-home', 'Authenticated organizer home/dashboard');

  // ─── Step 5: Try to find manage event surfaces ───────────────────
  // Navigate to the events/create flow
  await page.goto('https://lu.ma/create', { waitUntil: 'domcontentloaded' });
  await waitForStable(page);
  await captureSnapshot(page, 'create-event', 'Create new event flow — form fields and layout');

  // ─── Step 6: Look for an existing event's manage page ────────────
  // Go to the organizer's event list
  await page.goto('https://lu.ma/home', { waitUntil: 'domcontentloaded' });
  await waitForStable(page);

  // Try to find a link to an existing event in the event list
  const eventLinks = await page.$$eval(
    'a[href*="/event/"]',
    (links) => links.slice(0, 5).map((a) => ({
      href: (a as HTMLAnchorElement).href,
      text: a.textContent?.trim().slice(0, 80) || '',
    })),
  ).catch(() => []);

  log('found_event_links', { count: eventLinks.length });

  if (eventLinks.length > 0) {
    const firstEvent = eventLinks[0]!;
    log('navigating_to_event', { url: firstEvent.href });
    await page.goto(firstEvent.href, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await captureSnapshot(page, 'own-event-manage', `Own event page: ${firstEvent.text}`);

    // Try to navigate to the manage/guests/registration tabs
    const manageUrl = page.url().replace(/\/$/, '') + '/manage';
    await page.goto(manageUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await waitForStable(page);
    await captureSnapshot(page, 'event-manage-overview', 'Event manage overview page');

    // Try guest list
    const guestsUrl = page.url().replace(/\/manage.*/, '') + '/manage/guests';
    await page.goto(guestsUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await waitForStable(page);
    await captureSnapshot(page, 'event-manage-guests', 'Manage guests / attendee list');

    // Try registration settings
    const registrationUrl = page.url().replace(/\/manage.*/, '') + '/manage/registration';
    await page.goto(registrationUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await waitForStable(page);
    await captureSnapshot(page, 'event-manage-registration', 'Registration settings — questions, capacity, approval');
  }

  // ─── Step 7: Capture a paid event page if accessible ─────────────
  // Look for any event with pricing
  const paidEventLinks = await page.$$eval(
    'a[href*="/event/"]',
    (links) => links.slice(0, 10).map((a) => ({
      href: (a as HTMLAnchorElement).href,
      text: a.textContent?.trim().slice(0, 80) || '',
    })),
  ).catch(() => []);

  // Also try a popular public tech event for a second reference
  await page.goto('https://lu.ma/discover', { waitUntil: 'domcontentloaded' });
  await waitForStable(page);

  // Click the first event card on discover
  const discoverEventLink = await page.$eval(
    'a[href^="/"]',
    (a) => (a as HTMLAnchorElement).href,
  ).catch(() => null);

  if (discoverEventLink && !discoverEventLink.includes('/discover')) {
    const fullUrl = discoverEventLink.startsWith('http')
      ? discoverEventLink
      : `https://lu.ma${discoverEventLink}`;
    await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await captureSnapshot(page, 'discover-event-detail', 'Event from discover page — different layout/host');
  }

  // ─── Step 8: Capture the registration form interaction ───────────
  // Go back to the example event and try opening the registration modal
  await page.goto('https://lu.ma/central-park-meetup', { waitUntil: 'domcontentloaded' });
  await waitForStable(page);

  // Try clicking the register button
  const registerButton = await page.$('button:has-text("Register"), button:has-text("RSVP"), button:has-text("Get Ticket")');
  if (registerButton) {
    await registerButton.click().catch(() => {});
    await page.waitForTimeout(2000);
    await captureSnapshot(page, 'registration-form-open', 'Registration form/modal after clicking register CTA');
  }

  // ─── Write notes ─────────────────────────────────────────────────
  const notesPath = path.join(OUTPUT_DIR, 'audit-notes.json');
  fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2), 'utf8');
  log('notes_written', { path: notesPath, count: notes.length });

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Captured ${notes.length} screenshots in ${OUTPUT_DIR}`);
  console.log(`Notes:   ${notesPath}`);
  console.log(`${'═'.repeat(50)}`);
  console.log('\nBrowser stays open for 60s for manual exploration.');
  console.log('Close it manually or wait.\n');

  await new Promise((r) => setTimeout(r, 60_000));
  await context.close().catch(() => {});
  log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
