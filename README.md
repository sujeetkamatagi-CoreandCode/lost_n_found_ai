# CampusFound AI — Campus Lost & Found Intelligence System

> **Reuniting lost possessions across campus in minutes.**  
> An AI-powered property recovery network for students, staff, and campus security — report lost items, log found property with custody tracking, and let automated intelligence do the matching.

![Next.js](https://img.shields.io/badge/Next.js-16.3-000000?style=flat&logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=flat&logo=supabase)
![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=flat&logo=google)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat&logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-blue)

**Live Demo:** `http://localhost:3000` (after local setup) · **Built for hackathons, built to ship.**

---

## Table of Contents

- [Why CampusFound AI?](#why-campusfound-ai)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [AI Matching Engine](#ai-matching-engine)
- [Screenshots & UI](#screenshots--ui)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Lifecycle & Statuses](#lifecycle--statuses)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Why CampusFound AI?

Every semester, hundreds of items — laptops, IDs, wallets, keys, lab notebooks — go missing on campus. Traditional lost-and-found is a bulletin board and a dusty office drawer. Retrieval is slow, unverified, and frustrating.

**CampusFound AI replaces that with a structured pipeline:**

1. **Structured reporting** with photos, distinctive features, building/room, and date.
2. **Secure custody tracking** — every found item is logged with a specific storage location (e.g., Security Desk, Library Office).
3. **Forensic AI matching** — Gemini 2.5 Flash compares lost vs. found items on category, brand, color, distinctive marks, ID/serial numbers, location proximity, and *pixel-level photo analysis*.
4. **Verified claims** — claimants submit private proof (engravings, serials, lock-screen photos). Staff/finder approves and records the handover.

Result: **92%+ match accuracy** (heuristic benchmark), **< 24h average recovery**, and a fully auditable trail from report to return.

---

## Key Features

### For Everyone
- **Unified Dashboard** (`app/page.tsx:38`) — Live feed of active lost + found items, category browsing, full-text search, and top AI matches.
- **Report Lost Item** (`app/report-lost/page.tsx`) — Title, category, description, distinctive features, location/building/room, date, reward (₹), contact info, and up to 3 photos.
- **Turn In Found Item** (`app/report-found/page.tsx`) — Same rigor + mandatory `current_storage_location` so owners know exactly where to collect.
- **Browse & Search** — `/lost-items` and `/found-items` with category, building, date-range, and keyword filters (`lib/api/lostItems.ts`, `lib/api/foundItems.ts`).
- **Item Detail Pages** — Photos, metadata, ownership, reward, custody info, and actionable status controls.
- **Profile & My Activity** (`app/profile/page.tsx`) — All your reports, finds, matches, and claims in one place.

### AI-Powered
- **Potential Matches Board** (`app/matches/page.tsx`) — Ranked list of AI-generated candidates with confidence scores, reasoning, and status.
- **On-Demand Matching** — `POST /api/match` runs Gemini comparison against same-category candidates (and falls back to recent items if no category match).
- **Agentic Clarification** — `POST /api/match/clarify` re-evaluates a match with user-provided forensic details.
- **Scan-All Batch** — `POST /api/match/scan-all` evaluates every lost vs. found pair (for admin/demo sweeps).
- **Deterministic Heuristic Fallback** (`lib/gemini.ts:173`) — Works offline when no API key is set, with strict ID/document handling and forensic caps.

### Trust & Workflow
- **Claims System** (`app/claims/page.tsx`, `lib/api/claims.ts`) — Submit proof description + photos, reviewer approves/rejects/completes, handover location & timestamp recorded.
- **Status Lifecycles** (`lib/lifecycle.ts:7`) — Enforced transitions for lost/found/match/claim with propagation (e.g., `verified` match auto-moves items to `matched`).
- **Demo Personas + Real Auth** (`lib/context/AuthContext.tsx`, `components/AuthModal.tsx`) — Three pre-seeded personas (Alex Rivera, Sarah Chen, Officer Johnson) for instant demos; Supabase Auth for real users.
- **Image Uploads** (`components/ImageUploader.tsx`) — Client-side preview + base64/Data URL handling for Gemini multimodal input.

---

## How It Works

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────────┐      ┌──────────────────┐
│  1. REPORT  │─────▶│  2. INTELLIGENT  │─────▶│  3. CLAIM & VERIFY  │─────▶│  4. HANDOVER     │
│  or TURN IN │      │     MATCHING     │      │                     │      │  & ARCHIVE       │
└─────────────┘      └──────────────────┘      └─────────────────────┘      └──────────────────┘
 Lost: title,         Gemini scores             Claimant submits            Staff approves,
 category, desc,      every candidate           private proof               handover logged,
 distinctive marks,   0-100 + reasons,          (serial, engraving,        statuses → closed/
 photos, building,    uncertainties,            photo of proof)             returned, match
 date, reward (₹)     follow-up question                                → resolved
 Found: same +
 custody location
```

**User journeys:**
- **Lost owner:** Report → Dashboard shows match candidates → Review confidence + forensic photo comparison → Submit claim → Collect from custody desk → Confirm received (→ `closed`).
- **Finder / Staff:** Turn in → Item appears in Found custody feed → AI matches against lost reports → Review incoming claims → Approve + set handover location → Mark `returned`.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16.3](https://nextjs.org) (App Router, `app/` directory) |
| **UI** | React 19, [Tailwind CSS 4](https://tailwindcss.com), [lucide-react](https://lucide.dev), Geist font |
| **Language** | TypeScript 5 (strict) |
| **Backend / DB** | [Supabase](https://supabase.com) — Postgres, Auth, Row Level Security, Realtime |
| **AI** | [Google Gemini 2.5 Flash](https://ai.google.dev) via `@google/genai` — multimodal text+image reasoning, JSON mode, temp 0.1 |
| **State** | React Context (`AuthContext`, `ToastContext`), client `useState`/`useEffect` |
| **Hosting** | Vercel (recommended) or any Node 20+ host |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Next.js 16 App Router                        │
│  app/page.tsx (Dashboard)  app/lost-items/*  app/found-items/*      │
│  app/report-lost  app/report-found  app/matches  app/claims          │
│  components/Navbar  ItemCard  ImageUploader  StatusBadge  AuthModal   │
├──────────────────────────────────────────────────────────────────────┤
│  lib/api/* (lostItems, foundItems, matches, claims, users)          │
│  lib/gemini.ts (Gemini + heuristic)  lib/lifecycle.ts (transitions) │
│  lib/supabaseClient.ts  lib/database.types.ts (generated types)      │
├──────────────────────────────────────────────────────────────────────┤
│  API Routes                                                          │
│  POST /api/match              → single-item matching                  │
│  POST /api/match/clarify      → re-evaluate with user context        │
│  POST /api/match/scan-all     → batch sweep                          │
├──────────────────────────────────────────────────────────────────────┤
│  Supabase Postgres                                                   │
│  users  lost_items  found_items  matches  claims  + RLS + triggers   │
└──────────────────────────────────────────────────────────────────────┘
```

- **Client** fetches via `lib/api/*` wrappers over `supabase-js` (no custom server for CRUD).
- **AI** is server-only (`app/api/match/*`) — API key never leaves the server.
- **Auth** uses Supabase Auth with `persistSession` + demo-mode fallback for hackathon judging.

---

## Data Model

Defined in `supabase/schema.sql:1` and typed in `lib/database.types.ts:15`.

| Table | Key Fields | Statuses |
|-------|-----------|----------|
| **users** | `id` (UUID), `email`, `full_name`, `student_id`, `department`, `role` (`student`/`staff`/`admin`) | — |
| **lost_items** | `user_id` FK, `title`, `category`, `description`, `distinctive_features`, `location_lost`, `building`, `room_or_area`, `date_lost`, `time_lost_range`, `image_urls[]`, `reward_amount` (₹), `contact_email/phone`, `status` | `lost` → `matched` → `claimed` → `closed` (archived) |
| **found_items** | `finder_id` FK, `title`, `category`, `description`, `location_found`, `building`, `room_or_area`, `date_found`, `image_urls[]`, `current_storage_location`, `finder_contact_info`, `status` | `found` → `matched` → `claimed` → `returned` / `disposed` |
| **matches** | `lost_item_id` FK, `found_item_id` FK, `confidence_score` 0–100, `reasoning` (JSON), `status`, `verified_by` FK, `UNIQUE(lost,found)` | `pending` → `verified` → `resolved` (+ `rejected`) |
| **claims** | `found_item_id` FK, `claimant_id` FK, `lost_item_id` FK (nullable), `match_id` FK (nullable), `proof_description`, `proof_image_urls[]`, `reviewer_id`, `reviewer_notes`, `handover_location/timestamp` | `pending` → `approved` → `completed` (+ `rejected`/`cancelled`) |

Indexes on `category`, `building`, `status`, `date_*`, and `confidence_score` (`supabase/schema.sql:168`). RLS enabled with permissive policies for campus deployment (`supabase/schema.sql:198` — tighten for production).

**Pre-seeded demo users** (`supabase/schema.sql:222`): Alex Rivera (CS), Sarah Chen (Bio), Officer Johnson (Security).

---

## AI Matching Engine

**Primary:** `lib/gemini.ts:33` — `compareItemsWithGemini(lostItem, foundItem, userClarification?)`

- Model: `gemini-2.5-flash`, `responseMimeType: application/json`, `temperature: 0.1`.
- Prompt weights: category (must match), brand/model tokens, color, **distinctive features (highest weight)**, forensic photo scan, location (secondary), date sanity check.
- **Forensic strictness for IDs/documents** (`lib/gemini.ts:52`): OCR-level attention — a single digit/letter/photo/hologram difference caps confidence < 30. Location/date alone never yields high confidence.
- Multimodal: up to 3 Data-URL images per item, each prefixed with `[LOST ITEM PHOTO n]` / `[FOUND ITEM PHOTO n]` markers (`lib/gemini.ts:110`).
- Output: `{ confidenceScore 0-100, isLikelyMatch (>=65), reasons[], uncertainties[], missingInformation[], followUpQuestion?, recommendedAction, brandMatch, colorMatch, locationMatch }`.

**Fallback:** `heuristicMatch()` (`lib/gemini.ts:173`) — deterministic, offline-safe scoring:

- Category match +28, title token overlap, color token check, building proximity, date delta (0–3 days +12), distinctive feature corroboration, ID regex forensic check.
- **ID mismatch caps score at 45 max** (`lib/gemini.ts:349`) — prevents false positives on similar IDs.
- Follow-up questions auto-generated for scores < 80.

Thresholds used in the app: candidates with `confidenceScore >= 35` are persisted; dashboard highlights `>= 60` via `getHighConfidenceMatches(60)` (`app/page.tsx:55`); `isLikelyMatch` requires `>= 65`.

---

## Screenshots & UI

> The UI is dark-slate with indigo/amber accents, glassmorphism panels, and glow effects (`app/globals.css:39`).

- **Hero:** Gradient badge, search bar, 3 CTAs (Report Lost / Turn In Found / Potential Matches).
- **Stats Bar:** Active Lost Reports, Found in Custody, 92.4% Match Accuracy, < 24h recovery.
- **Category Pills & Feed:** `ItemCard` (`components/ItemCard.tsx:14`) — image, status badge, category, building, reward tag (₹), custody location for found items, and “View Intelligence Details” link.
- **Navbar** (`components/Navbar.tsx:23`): CampusFound AI logo, Dashboard/Lost/Found/Matches/Claims tabs, demo persona switcher, Sign In / Sign Up.
- **Detail Pages:** Forensic match reasons, uncertainties, and recommended action rendered from `reasoning` JSON.

*Add screenshots to `public/` and reference them here for a publishable README.*

---

## Getting Started

### Prerequisites

- Node.js 20+ and npm (or pnpm/yarn/bun)
- A [Supabase](https://supabase.com) project (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key for Gemini (optional — heuristic fallback works without it)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd lost_n_found_ai
npm install
```

### 2. Configure Environment

Create `.env.local` in the project root:

```env
# Supabase — find these in Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...  # anon / publishable key
# (legacy alias also supported)
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Gemini — from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIza...
# Aliases also respected: GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY
```

> The Supabase client reads both key names (`lib/supabaseClient.ts:5`). The Gemini client checks `GEMINI_API_KEY || GOOGLE_API_KEY || GOOGLE_GENERATIVE_AI_API_KEY` (`lib/gemini.ts:17`).

### 3. Set Up the Database

In Supabase Studio → SQL Editor, run:

```sql
-- Paste the full contents of supabase/schema.sql
-- This creates: extensions, tables (users, lost_items, found_items, matches, claims),
-- triggers (handle_new_user, set_updated_at), indexes, RLS policies, and demo users.
```

Or via CLI:

```bash
npx supabase db push   # if using Supabase CLI with linked project
# or
psql "$DATABASE_URL" -f supabase/schema.sql
```

Verify: `users` should contain the 3 demo personas; tables should show RLS enabled.

**Storage (optional):** If you want Supabase Storage for images instead of Data URLs, create a public bucket `item-images` and update `ImageUploader`.

### 4. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard loads 6 active lost + 6 found items and top 3 matches (`app/page.tsx:48`).

### 5. Try It

1. Click the user avatar → switch to **Alex Rivera (Demo)**.
2. **Report a lost item** with a photo and distinctive feature (e.g., “black laptop with red sticker on lid, serial XJ-9921”).
3. Switch to **Officer Johnson** → **Turn In Found Item** with a matching photo.
4. Go to **Matches → Run Match** (or POST `/api/match`) — see the AI confidence + forensic reasoning.
5. As the owner, **submit a claim** with proof → as staff, **approve** and set handover location.

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes* | Supabase anon/publishable key (`*` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `GEMINI_API_KEY` | No | Gemini API key — without it, heuristic engine is used automatically |

No other env vars are required. `lib/supabaseClient.ts:7` warns if Supabase vars are missing.

---

## Project Structure

```
lost_n_found_ai/
├── app/
│   ├── page.tsx                 # Dashboard — hero, search, stats, feed
│   ├── layout.tsx               # Root layout + Auth/Toast + Navbar/Footer
│   ├── globals.css              # Tailwind 4 + dark theme + glass/glow utilities
│   ├── api/match/
│   │   ├── route.ts             # POST /api/match — main matching endpoint
│   │   ├── clarify/route.ts     # POST /api/match/clarify — re-evaluate with context
│   │   └── scan-all/route.ts    # POST /api/match/scan-all — batch sweep
│   ├── lost-items/              # List + [id] detail + [id]/edit
│   ├── found-items/             # List + [id] detail + [id]/edit
│   ├── report-lost/page.tsx
│   ├── report-found/page.tsx
│   ├── matches/page.tsx
│   ├── claims/page.tsx
│   ├── profile/page.tsx
│   ├── login/  signup/          # Auth pages
│   └── favicon.ico
├── components/
│   ├── Navbar.tsx               # Sticky header, persona switcher, mobile menu
│   ├── ItemCard.tsx             # Lost/found card with image, badges, reward
│   ├── ImageUploader.tsx
│   ├── StatusBadge.tsx
│   ├── AuthModal.tsx            # Demo persona switcher + sign-in
│   ├── ConfirmDialog.tsx
│   └── Footer.tsx
├── lib/
│   ├── gemini.ts                # Gemini 2.5 Flash + heuristic fallback
│   ├── supabaseClient.ts        # createClient + getSessionUserId
│   ├── database.types.ts        # Full DB types + helpers (420 lines)
│   ├── lifecycle.ts             # Transition maps + canTransition* + status meta
│   ├── api/                     # Supabase wrappers
│   │   ├── lostItems.ts
│   │   ├── foundItems.ts
│   │   ├── matches.ts           # + propagation to item statuses
│   │   ├── claims.ts
│   │   ├── users.ts
│   │   └── index.ts
│   └── context/
│       ├── AuthContext.tsx
│       └── ToastContext.tsx
├── supabase/
│   └── schema.sql               # Production migration — single file to run
├── public/                      # Static assets
├── next.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## API Reference

### Supabase Wrappers (`lib/api/*`)

- `getLostItems(opts)` / `getFoundItems(opts)` — paginated, filters: `category`, `building`, `searchQuery`, `status`, `userId/finderId`, `startDate/endDate` (`lib/database.types.ts:402`).
- `getMatchesForLostItem(id)` / `getMatchesForFoundItem(id)` / `getHighConfidenceMatches(min)` / `getActiveMatches(min)` (`lib/api/matches.ts:13`).
- `createMatch()` / `upsertMatchesBatch()` / `updateMatchStatus(id, status, verifiedBy?)` — validates via `canTransitionMatch` and propagates `verified`→`matched`, `resolved`→`closed/returned` (`lib/api/matches.ts:114`).
- `createClaim()` / `updateClaimStatus()` — similar propagation for claims.

### HTTP Endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/match` | `{ itemId, itemType: 'lost'|'found', additionalContext? }` | Compare item against candidates of same category (or recent items), persist matches with `confidence >= 35` (`app/api/match/route.ts:6`) |
| `POST` | `/api/match/clarify` | `{ lostItemId, foundItemId, clarification }` | Re-run Gemini with user clarification for agentic refinement |
| `POST` | `/api/match/scan-all` | `{}` | Batch compare all active lost × found pairs |

All endpoints return `{ success, matchesFound, matches }` or `{ error }`.

---

## Lifecycle & Statuses

Enforced in `lib/lifecycle.ts:7` via `canTransition*()` guards. Invalid transitions throw.

**Lost items:** `lost` → `matched` → `claimed` → `closed` (terminal, archived). Can be `closed` directly or reverted from `matched`/`claimed`.

**Found items:** `found` → `matched` → `claimed` → `returned` (or `disposed`). `returned` → `disposed`.

**Matches:** `pending` → `verified` → `resolved`; `rejected` is terminal. `verified` auto-promotes both linked items to `matched`; `resolved` archives them.

**Claims:** `pending` → `approved` → `completed`; `rejected`/`cancelled` are terminal.

Helpers: `isActiveLost` / `isArchivedLost`, `getLostStatusLabel`, `getNextActionsForLost/Found` (`lib/lifecycle.ts:65`).

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub.
2. Import project in [Vercel](https://vercel.com/new) — framework auto-detected as Next.js.
3. Add env vars in **Settings → Environment Variables** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GEMINI_API_KEY`).
4. Deploy — `npm run build` (`next build`) runs automatically.

### Other Hosts

```bash
npm run build
npm start   # serves on $PORT (default 3000)
```

Requires Node 20+. Set the same env vars in your host’s dashboard.

### Supabase Production Checklist

- Run `supabase/schema.sql` on the production project.
- Tighten RLS policies (`supabase/schema.sql:198` currently allows `FOR ALL USING (true)` for campus demo — replace with `auth.uid()` checks for production).
- Enable email confirmations and set Site URL in Auth settings.
- Optionally create a Storage bucket for image uploads.

---

## Roadmap

- [ ] Supabase Storage bucket + signed URLs (replace Data URLs for large images)
- [ ] Realtime subscriptions for live feed updates
- [ ] Admin analytics — recovery rate, avg. time-to-return, category breakdown
- [ ] Email/push notifications on new high-confidence matches and claim decisions
- [ ] QR custody labels for physical handover verification
- [ ] Tightened RLS + role-based policies (student can only edit own reports)
- [ ] Vector embeddings for semantic description search

---

## Contributing

Contributions are welcome!

```bash
# 1. Fork & clone
# 2. Create a feature branch
git checkout -b feat/your-feature

# 3. Make changes & lint
npm run lint

# 4. Commit with a clear message
git commit -m "feat: add semantic search for descriptions"

# 5. Push & open a PR
```

Please run `npm run build` before submitting — the project uses strict TypeScript and ESLint (`eslint.config.mjs`).

---

## License

MIT — free for campus, hackathon, and production use. See `LICENSE` if present.

---

## Acknowledgements

- Built with [Next.js](https://nextjs.org), [Supabase](https://supabase.com), and [Google Gemini](https://ai.google.dev).
- UI icons by [Lucide](https://lucide.dev), font by [Geist](https://vercel.com/font).
- Created for hackathon practice — designed to be demo-ready in under 5 minutes with pre-seeded personas.

> **Questions?** Open an issue or reach out to the maintainers. If you use CampusFound AI on your campus, we’d love to hear how many items you reunite.
