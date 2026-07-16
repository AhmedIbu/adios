# Pocket Audio 🎧

Your personal audio library as a PWA. Upload from any device, stream anywhere, keep tracks offline — locked to you, no Apple Developer account needed.

**Stack:** React 18 + TypeScript + Vite + vite-plugin-pwa · Supabase (auth, Postgres, storage) · IndexedDB for offline copies · plain external CSS with BEM (no Tailwind).

---

## 1. Set up Supabase (10 min, free)

1. Go to [supabase.com](https://supabase.com) → New project (Free tier, pick the Mumbai region for lowest latency).
2. **SQL Editor** → paste and run `supabase/setup.sql`. This creates the `tracks` table, a private `audio` bucket, and row-level security so only your user can touch anything.
3. **Authentication → Users → Add user** → create yourself with your email + a strong password. (Use "Auto Confirm User".)
4. **Authentication → Sign In / Up** → turn **OFF** "Allow new users to sign up". Now literally nobody else can ever create an account.
5. **Project Settings → API** → copy the `Project URL` and `anon public` key.

## 2. Run it locally

```bash
cp .env.example .env    # paste your URL + anon key into .env
npm install
npm run dev
```

Sign in once with the user you created in step 1.3. The session persists — you won't see the login screen again on this device.

## 3. Deploy (free, 5 min)

Vercel is the easiest:

1. Push this folder to a private GitHub repo.
2. [vercel.com](https://vercel.com) → New Project → import the repo.
3. Add the two environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in project settings.
4. Deploy. You get a `https://your-app.vercel.app` URL.

Netlify or Cloudflare Pages work identically. **HTTPS is required** for PWA install and background audio — all three give it automatically.

## 4. Put it on your iPhone

1. Open your deployed URL in **Safari** (must be Safari, not Chrome).
2. Tap **Share → Add to Home Screen**.
3. Open it from the icon, sign in once. Done — it's now your app.

## Features

- **Hybrid storage** — everything lives in your private Supabase bucket; tap **↓** on any track to keep an offline copy on the phone (stored in IndexedDB, survives app closes). Tap **✓** to remove it.
- **Resume position** — saved every 5 seconds per track, synced to the cloud, so a lecture resumes where you left it even on another device.
- **Playback speed** 0.75×–2×, **sleep timer** 15/30/60 min, **±15s skip**.
- **Folders** — Music / Lectures / Notes chips, chosen at upload.
- **Lock-screen controls** — play/pause/skip from the iOS lock screen via the Media Session API; audio keeps playing when the screen locks.
- **Dark/light theme** toggle with smooth transitions; respects reduced-motion.

## Honest limits (iOS PWA reality)

- Audio pauses if iOS kills the app under heavy memory pressure (rare in practice).
- No Siri, no AirPods auto-switch fanciness, no push notifications.
- Offline copies count against Safari's storage quota; keeping the app on your Home Screen makes iOS treat that storage as durable.

## Free-tier headroom

Supabase free tier: 1 GB storage, 5 GB egress/month. At ~1 MB/min for decent-quality audio that's roughly 16 hours of stored audio and ~80 hours of streaming per month — plenty for one person, and offline copies don't consume egress on replay.
