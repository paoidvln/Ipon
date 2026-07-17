# Ipon Challenge

A personal savings-challenge tracker with accounts, MongoDB persistence,
a progress chart, and real browser push reminders. Three challenge types:

- **52-Week** — ₱10 × week number, growing to ₱13,780
- **100-Envelope** — envelopes are shuffled and hidden until tapped, ₱1–₱100, total ₱5,050
- **Custom** — pick your own goal and how many parts to split it into

## Stack

Node.js, Express, MongoDB (Mongoose), EJS views, vanilla JS on the client,
Chart.js (via CDN) for the savings-over-time chart, and the Web Push API
(service worker + `web-push`) for reminders.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the env template and fill it in:
   ```bash
   cp .env.example .env
   ```
   - `MONGO_URI` — a local MongoDB (`mongodb://127.0.0.1:27017/ipon-challenge`)
     or an Atlas connection string.
   - `SESSION_SECRET` — any long random string.

3. Generate VAPID keys for push notifications:
   ```bash
   npm run generate-vapid
   ```
   Paste the printed `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` into `.env`.
   (The app still runs without these — push notifications just stay disabled.)

4. Start MongoDB if it isn't already running, then start the server:
   ```bash
   npm run dev    # nodemon, auto-restarts on changes
   # or
   npm start
   ```

5. Visit `http://localhost:3000`, register an account, and start checking off entries.

## How reminders work

- The client registers `public/js/sw.js` as a service worker and, when you tap
  "Turn on daily reminders," subscribes to push using the VAPID public key.
  The subscription is stored on your user record in MongoDB.
- A cron job (`utils/reminderJob.js`, via `node-cron`) runs once a day at the
  hour set by `REMINDER_HOUR` in `.env` (default 8 PM server time). For every
  user with a subscription, it checks whether they've saved anything that day
  across their active challenges — if not, it sends a push reminder.
- If a subscription has expired or been revoked (browser data cleared,
  notifications turned off, etc.), the server detects the failed push and
  clears the stored subscription automatically.
- Push notifications require HTTPS in production (localhost is exempt for
  local development). If you deploy this, make sure it's served over HTTPS.

## Notes

- Each user has at most one active challenge per type (`week52`, `env100`,
  `custom`). Resetting `week52`/`env100` rebuilds the entries (env100
  reshuffles); resetting `custom` just clears checkmarks. Rebuilding `custom`
  from the form replaces it entirely.
- `public/js/sw.js` references `/icons/icon-192.png` for the notification
  icon — add your own icon there, or remove the `icon`/`badge` lines in the
  service worker if you don't want one.
- Sessions are stored in MongoDB via `connect-mongo`, so logins survive
  server restarts.
