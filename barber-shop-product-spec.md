# Mosisa Barber Shop — Product Specification

**Status:** Planning complete, ready for development
**Last updated:** 2026-09-19

---

## 1. Product Overview

Mosisa Barber Shop is a single-location, classic/traditional barbershop with modern service delivery. The product is a Next.js website that allows customers to discover the shop, browse barbers and services, book appointments online, and manage those bookings — plus an admin dashboard for staff to run day-to-day operations.

**Positioning:** Classic/traditional barbershop, modern service. Not a luxury lounge, not a trendy streetwear shop — a shop that respects craft and tradition while making the booking experience effortless.

**Primary growth driver:** Individual barbers' skill and reputation, not shop-wide brand alone. Customers are expected to travel city-wide to book with a specific barber whose work they've seen.

---

## 2. Business Goals

- **Year 1 primary goal:** Acquire new customers (growth/awareness), driven by barber reputation.
- Secondary goals (not year-1 priority, but informed design decisions): reducing no-shows/late cancellations, reducing admin phone workload, building brand equity.

---

## 3. Target Users

- **Primary:** New, first-time customers across the city who discover a specific barber's work (via the site, social media, or word of mouth) and want to book with that person specifically.
- **Secondary:** Existing/regular customers who use the site for quick, repeat bookings.
- **Staff/Admin:** 2–3 barbers and shop staff who manage appointments, availability, and services.

---

## 4. Business Details

| Item | Decision |
|---|---|
| Shop name | Mosisa Barber Shop |
| Location model | Single shop, city-wide customer draw |
| Number of barbers | 2–3 |
| Services | Simple menu, 3–5 services (haircut, beard trim, combo, etc.) |
| Pricing/duration | Fixed per service — does NOT vary by barber |
| Opening hours | Fixed, same every day (shop-wide default) |
| Walk-ins | ~50/50 mix with online bookings. **No real-time sync between walk-ins and online availability in v1** — documented limitation (see §14) |
| Cancellation policy | Free cancel/reschedule up to 12 hours before appointment. Inside 12 hours: still allowed online, but flagged as a late change (soft warning, not blocked) |
| Timezone | Single timezone assumed: Africa/Addis_Ababa (no multi-timezone support needed) |
| Advance booking limit | Maximum 60 days out |
| Per-barber buffer time | Configurable per barber (cleanup/reset time between appointments) |

---

## 5. MVP Scope

### Customer-facing (MVP)
- Homepage — barber portfolios featured prominently
- Services page (list + pricing)
- Barbers overview page (cards) → dedicated page per barber (bio, portfolio, specialties)
- Full booking flow: service → barber → date/time → guest contact info → confirmation
- Guest booking only — **no customer accounts** in v1
- Compact confirmation modal + email + SMS confirmation with "Add to Calendar" button
- Guest appointment management via secure link (view / cancel / reschedule, 12hr rule enforced)

### Admin/Staff-facing (MVP)
- Staff login (Better Auth)
- Appointments dashboard (view, create, cancel — including manually logging walk-ins if staff choose to)
- Manage services (add/edit/price/duration)
- Manage barbers (profile, photos, specialties, bio)
- Set/edit shop working hours
- Set per-barber schedule overrides and days off
- Set blocked times (holidays, closures)
- View customer contact info per booking

### Phase 2 (post-launch)
- Optional customer accounts (booking history, faster rebooking)
- Real-time walk-in/online availability sync (revisit if double-booking becomes a real problem)
- Reviews/ratings display per barber (directly supports reputation-driven growth strategy)
- SMS appointment reminders (separate from booking confirmation)
- Barber-specific analytics for admin (bookings per barber, popular services)

### Optional / Nice-to-have (not prioritized)
- Loyalty/rewards program
- Gift cards / online payment
- Blog/content section for SEO
- Multi-location support
- Invisible CAPTCHA (cheap to add later if spam becomes a real issue)

---

## 6. User Flows

### Primary booking flow (service-first, default entry point)
1. Homepage → "Book Now" (persistent button, always visible)
2. Select service
3. Select barber (or "any available")
4. Select date (horizontal day-strip picker) → select time slot
5. Enter guest contact info (name, phone, email)
6. Confirm booking
7. Compact confirmation modal shown; full details + management link sent via email + SMS

### Barber-first shortcut (from a barber's profile page)
1. Visitor browses a specific barber's dedicated page
2. Clicks "Book with [Barber Name]"
3. Barber is pre-selected; flow skips directly to service selection (barber remains changeable)
4. Continues through date/time → guest info → confirmation as above

### Appointment management flow
1. Customer receives email/SMS with a unique secure management link (token-based, no login required)
2. Link opens appointment details: view, cancel, or reschedule
3. If within 12 hours of appointment time: action is still allowed, but a warning is shown ("this is a late change")

---

## 7. Sitemap

- `/` — Home
- `/services` — Services list
- `/barbers` — Barbers overview (cards)
- `/barbers/[slug]` — Dedicated barber page
- `/book` — Booking flow
- `/manage/[token]` — Guest appointment management (not in public nav)
- `/about` — Shop story/atmosphere
- `/contact` — Address, hours, phone
- `/admin` — Staff login
- `/admin/dashboard` — Appointments, services, barbers, hours, blocked times management

---

## 8. UI/UX Specification

### Design system
- **Aesthetic:** Dark & moody. Near-black/charcoal base, deep forest green and navy as supporting accents, brass/gold as the highlight color for CTAs, prices, and active states. Off-white/cream for body text.
- **Typography:** Classic serif for headlines (heritage, craft, trust), clean sans-serif for body/UI text (clarity, modern usability).
- **Navigation:** Hamburger menu for secondary links (Home, Services, Barbers, About, Contact). "Book Now" is a **separate, persistent button** — always visible, not nested inside the hamburger — sticky on mobile.
- **Booking date/time UI:** Horizontal scrollable day-strip picker, time slots displayed below the selected day.
- **Barber profiles:** Full dedicated pages (not modals/expandable cards) — supports SEO and shareable links tied to individual barber reputation.
- **Confirmation:** Compact modal/overlay immediately after booking; full persistent details delivered via email + SMS.

### States to design
Empty states, loading states, error states (including "this slot was just taken" for booking conflicts), success states — to be designed alongside component build in Stage 2 of the development plan.

---

## 9. Database Schema

```
barbers
  id, name, slug, bio, photo_url, specialties[], buffer_minutes, is_active

services
  id, name, description, duration_minutes, price, is_active

working_hours          -- shop-wide default hours
  id, day_of_week, start_time, end_time

barber_schedules       -- per-barber overrides to shop hours
  id, barber_id, day_of_week, start_time, end_time, is_off

blocked_times          -- holidays, closures, personal time off
  id, barber_id (nullable — null = whole shop), start_datetime, end_datetime, reason

appointments
  id, barber_id, service_id, customer_name, customer_phone, customer_email,
  start_datetime, end_datetime, status (confirmed/cancelled/completed/no_show),
  source (online/walk_in), management_token (unique), created_at

  -- PostgreSQL EXCLUDE constraint on (barber_id, [start_datetime, end_datetime))
  -- guarantees no overlapping appointments for the same barber, enforced at the DB level

staff_users             -- via Better Auth
  id, email, password_hash, name, role
```

**Deliberately excluded from v1:** a separate `customers` table (guest booking stores contact info directly on each appointment) and a `notifications` log table (email/SMS sends are fire-and-forget side effects, not queried later in v1).

---

## 10. Booking Logic

- **Availability calculation** considers: shop working hours → barber schedule overrides/days off → existing appointments → blocked times → per-barber buffer time → 60-day advance booking cap.
- **Double-booking prevention:** Enforced at the database level via a PostgreSQL `EXCLUDE` constraint (using the `btree_gist` extension) on `(barber_id, time_range)`. This guarantees that even under concurrent booking attempts (a race condition where two customers try to book the same slot simultaneously), the database physically rejects the second overlapping insert — this is not solely reliant on application-level "check-then-insert" logic, which is vulnerable to race conditions under real concurrent traffic.
- On a rejected insert (conflict), the customer sees a friendly "sorry, that slot was just taken — please pick another time" message rather than a raw error.
- **Cancellation/rescheduling:** Allowed via secure guest token link. Free up to 12 hours before the appointment; inside 12 hours, still allowed but flagged as a late change (soft warning, not a hard block).
- **Known limitation (documented, not a bug):** Walk-in appointments are not synced to online availability in real time in v1. Staff handle walk-in/online conflicts manually if they arise. Revisit in Phase 2 if this causes recurring problems.

---

## 11. Authentication & Authorization

- **Customers:** No accounts. Guest booking only, with a unique, unguessable `management_token` per appointment used to access the management page.
- **Staff/Admin:** Better Auth (self-hosted, Drizzle-native adapter). Simple email/password login for 2–3 staff accounts. Role field reserved on `staff_users` for potential future permission tiers (e.g., owner vs. barber-level access), though v1 may not need enforcement beyond "logged in or not."

---

## 12. Technical Architecture

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js + TypeScript | Modern, performant, strong ecosystem fit for this scope |
| Styling | Tailwind CSS | Fast, consistent design-token-driven styling |
| Database | PostgreSQL (hosted on Neon) | Relational integrity for booking data; native support for exclusion constraints; Neon integrates natively with Vercel/serverless |
| ORM | Drizzle | Lightweight, SQL-like, strong TypeScript support; raw SQL migration used for the exclusion constraint specifically |
| Auth | Better Auth | Self-hosted, modern API, official Drizzle adapter |
| Image storage | Vercel Blob | Native integration with Vercel hosting |
| Hosting | Vercel | Pairs natively with Blob storage and Neon |
| Email | Resend | Reliable transactional email, generous free tier, simple Next.js integration |
| SMS | SMSEthiopia | Local Ethiopian gateway — avoids Twilio's Ethio Telecom sender-ID registration requirements and inconsistent delivery via international gateways to Ethiopian networks. Integrated behind an internal abstraction layer (`sendSMS(to, message)`) so the provider remains swappable if needed. |

**Notification abstraction:** Both email and SMS sending are wrapped in internal functions rather than called directly from booking logic, isolating the app from any single vendor's API shape.

---

## 13. Security Considerations

- Server-side validation on all booking inputs (never trust client-side checks alone).
- Rate limiting by phone number and IP address to prevent spam/fraudulent bookings (no CAPTCHA in v1 — noted as a low-cost Phase 2 addition if bot spam becomes a real problem).
- Admin dashboard flags suspicious booking patterns (e.g., repeated no-shows/late cancellations from the same phone number) for staff review rather than automatically blocking.
- Guest management tokens must be cryptographically random and non-guessable (not sequential IDs).
- Staff authentication secured via Better Auth's standard practices (hashed passwords, session management).

---

## 14. SEO Strategy

- Dedicated, indexable URLs per barber (`/barbers/[slug]`) to support search visibility for reputation-driven, city-wide traffic (e.g., searches for a specific barber's name + city).
- Meta tags and structured data planned per barber and service page during Stage 10 of the development plan.
- Server-rendered content (Next.js) ensures barber and service pages are fully crawlable.

---

## 15. Performance & Accessibility

- Image optimization via Next.js Image component + Vercel Blob.
- Mobile-first responsive design throughout (given mobile-first requirement and the day-strip booking UI).
- Accessibility considerations built into the design system phase (contrast ratios for the dark color palette, keyboard navigation for booking flow, proper form labeling).

---

## 16. Testing Strategy

- Concurrency testing is a required, explicit test case: simulate simultaneous booking attempts for the same barber/time slot to confirm the exclusion constraint correctly rejects overlaps.
- Functional testing of the 12-hour cancellation rule, 60-day booking cap, and per-barber buffer time logic.
- Rate-limiting behavior tested under repeated booking attempts from the same phone/IP.

---

## 17. Deployment Strategy

- Vercel production deployment, connected to Neon (Postgres) and Vercel Blob (images).
- Environment-based configuration for Resend and SMSEthiopia credentials.
- Monitoring/alerting recommended for email and SMS delivery failures, since these are critical to the guest management flow (no accounts means the token link is often the *only* way a customer can manage their booking).

---

## 18. Development Roadmap

| Stage | Goal | Key Dependency | Risk |
|---|---|---|---|
| 1. Project Setup | Working Next.js/TS/Tailwind skeleton, connected to Neon/Drizzle, deployed to Vercel | — | Low |
| 2. Design System | Typography, color tokens, base components | Stage 1 | Low |
| 3. Database & Schema | All tables migrated, exclusion constraint tested | Stage 1 | Medium — must validate constraint before building on it |
| 4. Public Website | Home, Services, Barbers (overview + dedicated pages), About, Contact | Stages 2–3 | Low |
| 5. Booking Engine | Full booking flow, availability calculation | Stages 3–4 | **High — technical core of the product** |
| 6. Notifications | Resend + SMSEthiopia integration, calendar button, token delivery | Stage 5 | Medium |
| 7. Guest Appointment Management | View/cancel/reschedule via token link | Stages 5–6 | Low |
| 8. Auth & Admin Dashboard | Better Auth, appointments/services/barbers/hours management | Stage 3 (can run parallel to 4–7) | Low |
| 9. Testing | Concurrency stress test, flow testing | Stages 5–8 | Medium — concurrency testing is non-negotiable |
| 10. Performance, SEO & Accessibility | Image optimization, meta tags, Lighthouse/accessibility audit | Stages 4–9 | Low |
| 11. Deployment & Launch | Production deployment, domain, delivery monitoring | All prior stages | Low |

---

## 19. Open Questions / Decisions Deferred

- Exact confirmation of whether the shop's growth strategy will eventually need per-barber marketing pages/landing pages beyond the standard profile (deferred — current dedicated barber pages should suffice for now).
- Whether an FAQ page becomes necessary post-launch if customer questions arise that aren't covered by policy text on the Booking/Contact pages.
- Whether a notifications/delivery-log table should be added if visibility into failed email/SMS sends becomes operationally important (currently excluded from v1 schema).
- Final selection confirmation and API integration details for SMSEthiopia (provider chosen, integration specifics to be finalized during Stage 6).

---

## 20. Key Decisions Log (Summary)

- Positioning: classic/traditional, modern service, dark & moody design (charcoal/green/navy/brass)
- Growth strategy: city-wide reach via individual barber reputation
- No customer accounts — guest booking + secure token-based management links
- Fixed pricing/duration across barbers; per-barber buffer time is configurable
- 12-hour free cancellation window, soft warning (not hard block) after
- Walk-in/online sync explicitly deferred to Phase 2 — documented limitation, not an oversight
- Double-booking prevented via PostgreSQL exclusion constraint (database-level guarantee, not just application logic)
- Spam prevention via rate limiting + admin flagging, no CAPTCHA in v1
- Stack: Next.js, TypeScript, Tailwind, PostgreSQL (Neon), Drizzle, Better Auth, Vercel Blob, Vercel hosting, Resend (email), SMSEthiopia (SMS)
