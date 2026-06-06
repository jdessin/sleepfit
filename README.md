# SleepFit

A personal sleep and fitness tracking app for daily logging, trend review, and cross-device sync. Built as a mobile-first web app and deployed to Vercel.

## What it tracks

**Sleep & Morning**
- Wake feeling (1–5 scale)
- Sleep disruptions (bathroom, RLS, temperature, anxiety, pain, etc.)
- RLS intensity
- Garmin sleep score, sleep duration, body battery, HRV status, resting heart rate
- Morning notes

**Workout**
- Workout type (Strength, Cardio, Hike, Strength + Cardio, Rest day)
- Duration, strength performance (1–5), cardio pace feel
- Workout symptoms (lightheadedness, heart racing, nausea, heavy legs, etc.)
- Workout notes

**Evening**
- Evening energy level (1–5)
- Focus rating (1–5) and focus duration
- Medication taken, AM/PM dose
- Physical sensations (jittery, heart racing, dizzy, heavy legs, nausea, etc.)
- Evening RLS and anxiety notes
- Nap taken, duration, and how the nap felt
- Legs rolled (foam rolling)
- Evening notes

**Dashboard**
- Trend charts across all tracked fields over logged days

---

## Tech stack

| Layer | Tool |
|---|---|
| Frontend | React 19 (Create React App), single-file component (`src/App.jsx`) |
| Hosting | [Vercel](https://vercel.com) (free hobby plan) |
| Serverless API | Vercel Functions (`api/sync.js`) |
| Cloud storage | [Upstash Redis](https://upstash.com) (free tier, REST API — no SDK needed) |
| Icons | [Tabler Icons](https://tabler.io/icons) (CDN) |
| Local persistence | `localStorage` (browser) |
| Version control | GitHub |

---

## How sync works

Data is stored locally in `localStorage` under the key `sleepfit_v3`. When a sync passcode is configured, data is also stored in Upstash Redis via the `/api/sync` serverless function, allowing the same data to appear on any device that has the passcode.

**Merge logic** — two timestamps prevent stale data from overwriting newer local data:
- `sleepfit_local_modified` — updated any time data changes locally
- `sleepfit_last_synced_ts` — updated any time data is successfully pulled from the server

On page load:
- If the server has data **and** local data has not been modified since the last sync → pull from server
- If local data is newer than the last sync → push local data to server

Changes are debounced and pushed to the server 1.5 seconds after each edit.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/jdessin/sleepfit.git
cd sleepfit
npm install
```

### 2. Create an Upstash Redis database

1. Go to [console.upstash.com](https://console.upstash.com) and sign up (free)
2. Click **Create Database**
3. Name it anything (e.g. `sleepfit`), choose a region close to you, leave Type as **Regional**
4. Click **Create**
5. On the database detail page, scroll to **REST API** and copy:
   - **UPSTASH_REDIS_REST_URL** — the `https://...upstash.io` URL
   - **UPSTASH_REDIS_REST_TOKEN** — the long token string

### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up / log in (free hobby plan is sufficient)
2. Click **Add New → Project**, import your GitHub repo
3. Leave all build settings at their defaults (Vercel detects Create React App automatically)
4. Before clicking **Deploy**, go to **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `UPSTASH_REDIS_REST_URL` | Paste from Upstash step above |
   | `UPSTASH_REDIS_REST_TOKEN` | Paste from Upstash step above |
   | `SYNC_PASSCODE` | Pick any secret string (e.g. `hunter2`) — this is your sync password |

5. Click **Deploy**

> **Important:** Every time you change environment variables in Vercel you must redeploy. Go to Deployments → click the three-dot menu on the latest deployment → **Redeploy**.

### 4. First-time setup on each device

1. Open the deployed app URL in your browser (or add it to your home screen)
2. Tap the **Settings** tab (gear icon)
3. Enter your `SYNC_PASSCODE` in the **Sync passcode** field and tap **Save & sync**
4. A green dot and "Synced ✓ [time]" will appear in the header when the connection succeeds
5. Repeat on every device — use the same passcode and all devices will share the same data

---

## Local development

```bash
npm start
```

The app runs at `http://localhost:3000`. Sync calls go to `/api/sync` which is only available when deployed on Vercel (or via `vercel dev`).

To test sync locally:

```bash
npm install -g vercel
vercel dev
```

`vercel dev` reads `.env.local` for environment variables. Create `.env.local` in the project root:

```
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
SYNC_PASSCODE=your-passcode-here
```

---

## Importing Garmin data

1. Export a CSV from [Garmin Connect](https://connect.garmin.com):
   - Go to **Health Stats** or use the **Reports** section to download a sleep CSV
2. In the app, go to **Log → Sleep** tab
3. Tap **Import Garmin CSV** and select your downloaded file
4. Garmin fields (sleep score, duration, body battery, HRV, resting HR) will be filled in for each matching date
5. Existing manually-entered data for those dates is preserved; only Garmin fields are overwritten

After import the data is immediately pushed to the server if a passcode is configured.

---

## Exporting data

In **Settings**, tap **Export CSV** to download all logged entries as `sleepfit_export.csv`. The CSV contains one row per day with all tracked fields.

---

## Clearing data

In **Settings**, tap **Clear all data**. This removes data from `localStorage` only — data stored in Upstash is not deleted. If you sync again after clearing, data will be restored from the server.

---

## Project structure

```
sleepfit/
├── api/
│   └── sync.js          # Vercel serverless function — GET/POST to Upstash Redis
├── public/
│   └── index.html       # Loads Tabler Icons from CDN
├── src/
│   ├── App.jsx          # Entire application — all UI, state, and sync logic
│   └── index.js         # React entry point
├── package.json
└── README.md
```

---

## Environment variables reference

| Variable | Where to set | Description |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Vercel → Settings → Environment Variables | REST endpoint for your Upstash database |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel → Settings → Environment Variables | Bearer token for Upstash REST auth |
| `SYNC_PASSCODE` | Vercel → Settings → Environment Variables | Secret string used to authenticate sync requests |
