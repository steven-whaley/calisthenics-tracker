# 5/3/1 Tracker

Next.js (App Router) + Neon Postgres (Drizzle) + Auth.js with Google sign-in. Deploys on Vercel.

## Features
- **Custom exercises** with a generated progression: training max (or 1RM × TM%), per-cycle increment, full block projection.
- **Multiple 3-week cycles before a deload** (configurable per exercise). TM increases after each cycle; deload follows the last cycle; then a new block starts.
- **Target vs. actual** logging per set, with a progress table and est. 1RM chart.
- **Joker sets** (per-exercise toggle): suggested in 5% steps above the top set, logged separately.
- **Profiles**: each user's data is isolated; Google federated login; units (lb/kg) and rounding.

## Setup
```bash
nvm use            # Node >= 20.9 (see .nvmrc)
npm install
cp .env.example .env.local
```
1. **Neon**: `vercel link && vercel integration add neon`, then `vercel env pull .env.local` (provides `DATABASE_URL`).
2. **Google OAuth**: Google Cloud Console → Credentials → OAuth client (Web). Authorized redirect URIs:
   `http://localhost:3000/api/auth/callback/google` and `https://<your-domain>/api/auth/callback/google`.
   Set `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
3. `npx auth secret` → `AUTH_SECRET`.
4. `npm run db:push` to create tables.
5. `npm run dev`.

Add the same env vars in Vercel (Project → Settings → Environment Variables) and `vercel deploy`.

## Progression rules
Weeks: 65/75/85×5+, 70/80/90×3+, 75/85/95×5/3/1+, deload 40/50/60×5. Jokers continue at +5% steps past the top set.

`npm test` runs the progression engine tests.
