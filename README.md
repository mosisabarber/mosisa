# Mosisa Barber Shop

Online booking platform for Mosisa Barber Shop (Addis Ababa).

**Build spec:** see [`AGENTS.md`](./AGENTS.md) — the authoritative, stage-by-stage implementation plan. Product/design rationale lives in `barber-shop-product-spec.md`.

## Tech stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **PostgreSQL** on [Neon](https://neon.tech) via **Drizzle ORM** (drizzle-kit migrations)
- **Better Auth** (staff/admin only — the public site has no accounts)
- **Vercel** hosting + **Vercel Blob** image storage
- **Resend** (email) + **SMSEthiopia** (SMS) for notifications
- **Zod** validation · **date-fns** for date handling · timezone: `Africa/Addis_Ababa` (fixed)

## Project structure

```
app/            Routes — (public)/ public pages, admin/ staff area, api/ endpoints
db/             Drizzle schema (schema.ts), migrations/, Neon client (client.ts)
lib/            booking/ availability+validation, notifications/ email+SMS+calendar, rate-limit
components/     ui/ design system, booking/, barbers/
```

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL etc. (see .env.example)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful scripts:

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate Drizzle migrations from `db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the database |

## Deployment (Vercel + Neon)

1. Push this repo to GitHub, then import it in Vercel (framework preset: Next.js).
2. Create a Neon project and copy its pooled connection string.
3. In Vercel → Settings → Environment Variables, add every variable from `.env.example` (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `SMSETHIOPIA_API_KEY`, `NEXT_PUBLIC_SITE_URL`). Never commit `.env` files.
4. Redeploy. Migrations are applied via `npm run db:migrate` (run locally against the Neon URL, or as a build/release step).

## Build progress

- [x] **Stage 1** — Project setup: Next.js + TS + Tailwind scaffold, Vercel-ready, Drizzle + Neon configured
- [x] Stage 2 — Schema + migration (incl. the `no_overlapping_appointments` EXCLUDE constraint; concurrency test passed against Neon)
- [x] Stage 3 — Design system (`components/ui`)
- [x] Stage 4 — Public content pages
- [x] Stage 5 — Booking engine (end-to-end smoke test passed: availability, 201 booking, 409 double-book rejection, 429 rate limit)
- [ ] Stage 6 — Notifications (Resend + SMSEthiopia + .ics)
- [ ] Stage 7 — Guest appointment management (`/manage/[token]`)
- [ ] Stage 8 — Auth + admin dashboard
- [ ] Stage 9 — Testing (concurrency, cancellation window, rate limits)
- [ ] Stage 10 — Performance / SEO / accessibility
- [ ] Stage 11 — Production deploy
