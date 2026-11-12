# MotionPay AI

Ask about an exercise. See how it works. Let the AI coach build a 4-week plan for your goal, schedule, and equipment, then unlock it with PayPal sandbox checkout.

MotionPay is an Expo SDK 58 / React Native mobile prototype with a FastAPI backend, Groq conversational AI, Supabase Auth/PostgreSQL, bundled, credited Wikimedia exercise GIFs, and YouTube tutorial fallback. Payments are **sandbox only**; no real money is charged. AI selects existing demonstrations and explains exercises. It does not generate new exercise footage or automatically authorize payments. One existing squat GIF can be rendered at half speed.

## What works

- Natural-language exercise requests and contextual follow-ups, with strict catalog/program ID validation.
- **AI-built plans unlocked with PayPal:** the user picks goal, level, days per week, equipment, and session length. Groq builds a 4-week plan using structured output restricted to library exercise IDs; the backend validates it (or falls back to deterministic rules if the AI is unavailable), sets the price server-side ($3.99 + $1 per weekly session), and stores it. Week 1 is a free preview; weeks 2–4 unlock through the same verified PayPal sandbox capture flow. The coach offers the builder in chat when a user describes their goal, schedule, or equipment.
- A 302-exercise library across bodyweight, dumbbells, bands, kettlebell, pull-up bar, barbell, machine, cable, and cardio, organized into 12 themed collections with search and filters. The original eight core exercises keep bundled Wikimedia GIFs or illustrations; the extended library uses credited Workout Guide frame sequences loaded from the package CDN. Instructions are draft content.
- Pinned chat input, visible-message media, pause/play, New chat, account-scoped in-memory conversations, and request cancellation.
- Email/password account creation and sign-in, persisted sessions, sign-out, confirmation resend, and web-based password recovery when its redirect is configured.
- A beginner program recommendation linked to program review. Current price comes from the backend database, not the model.
- PayPal sandbox approval, server-verified capture, durable checkout reservations, account-scoped purchase history, atomic access grants, and protected program content with exercise-detail links.
- Bounded request rates/concurrency, provider timeouts, cached tutorial results, sanitized application request logs, automated tests, and CI configuration.

## Requirements

- Node.js 22 LTS and npm; Python 3.12 with current OpenSSL. The macOS system Python 3.9 is not supported.
- Expo Go supporting SDK 58 for phone testing; iPhone and computer on the same Wi-Fi. Web testing is supported too.
- Your own Groq API key, Supabase project, and PayPal Developer sandbox app plus a **Personal buyer** test account. The sandbox app's Business seller must be different from the buyer. YouTube Data API v3 is optional for automatic unknown-exercise video lookup.
- Access to provider services and licensed external video services for fallback. Core GIFs and illustrations are bundled. No server secrets or buyer passwords are included in this repository. For judge access, either configure a hosted instance with test access privately supplied in the submission or follow these instructions with your own test credentials. Do not put secrets in the public repo.

## 1. Database and account setup

Create a Supabase project and enable email/password Auth. Copy its URL, publishable key, and backend-only service-role/secret key. Apply **each migration exactly once, in filename order**, using SQL Editor or your configured Supabase CLI workflow:

1. `supabase/migrations/202610210001_exercise_library.sql`
2. `supabase/migrations/202610210002_youtube_fallback.sql`
3. `supabase/migrations/202611090001_program_purchases.sql`
4. `supabase/migrations/202611090002_complete_purchase.sql`
5. `supabase/migrations/202611090003_checkout_recovery.sql`
6. `supabase/migrations/202611100001_custom_plans.sql` (AI plans: plan storage, per-plan checkout reservation, plan-aware purchase completion)

Existing configured projects should apply only missing migrations. The checkout migration preserves existing purchase rows. The exercise SQL tables are prepared for future use; the live exercise catalog is currently `mobile/src/data/catalog.json`. The SQL exercise review rules intentionally differ from the draft local catalog.

Email confirmation: confirm the message then return to sign in, or create an email-confirmed test user through your own dashboard. To enable password recovery, set a reachable web app origin as `EXPO_PUBLIC_AUTH_REDIRECT_URL`, set Supabase's Site URL appropriately, and allow `<origin>/recover` under Auth Redirect URLs. Recovery completes in that browser page. Do not disable email security merely to avoid configuration.

## 2. Backend

From the repository root:

```sh
cd backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.lock
cp .env.example .env
```

Fill in `backend/.env` locally:

| Variable | Purpose |
| --- | --- |
| `GROQ_API_KEY` | Hosted AI access; stays on server |
| `GROQ_MODEL` | Default `openai/gpt-oss-20b` |
| `SUPABASE_URL` | Your project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Used to verify signed-in users |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only database writes; supports legacy service-role JWT or newer `sb_secret_` key |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | **Sandbox** seller app credentials |
| `PUBLIC_API_URL` | Reachable backend origin for PayPal browser return pages |
| `CORS_ORIGINS` | Exact web app origins, e.g. `http://localhost:8081,http://localhost:8082` |
| `YOUTUBE_API_KEY` | Optional; enable YouTube Data API v3 for automatic tutorial search |

For phone testing set `PUBLIC_API_URL=http://YOUR_COMPUTER_WIFI_IP:8000`. For browser-only testing use `http://localhost:8000`. Do not use localhost on your phone to refer to your computer.

```sh
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --no-access-log --no-proxy-headers
```

Use `--reload` only during development. `/health` reports API status; `/ready` reports required configuration presence, not a guarantee that providers are online. Interactive API docs are at `/docs`.

## 3. Mobile / web frontend

In a second terminal, from the repository root:

```sh
cd mobile
npm ci
cp .env.example .env.local
```

Set:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_WIFI_IP:8000
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Only those public values belong in the app. Never add Groq, PayPal secret, or Supabase server keys to `EXPO_PUBLIC_` variables.

```sh
npx expo start --clear
```

Scan the QR code with Expo Go. For browser testing press **w** and use `http://localhost:8000` as the API URL. For Android emulator use `http://10.0.2.2:8000`. Restart Expo after environment changes. If you see an Expo Go SDK mismatch, check that the phone supports SDK 58.

## 4. Reproduce the demo

1. Open AI Coach and ask “Show me a squat.” Play/pause its credited GIF.
2. Ask “What muscles does it work?” Then “Make it slower.” The speed transformation currently supports the squat GIF only.
3. Ask “I am a beginner and want to get stronger.” Open the optional program recommendation.
4. Sign in, review the current sandbox price, and choose checkout. Use a PayPal sandbox **Personal buyer** account from Developer Dashboard → Testing Tools → Sandbox Accounts. Do not use the merchant account or a real card.
5. Approve, switch back to MotionPay, and tap **Verify payment**. Open the unlocked program and one of its exercise demonstrations.
6. Reopen the app and confirm access persists. Another account should remain locked. Cancelled/unapproved checkout must not unlock access.
7. Ask “Build me a 3-day dumbbell plan for glutes” (or tap **Build my AI plan** on Home). Choose preferences and build. Review the free week 1 preview, unlock with PayPal sandbox, verify, and confirm weeks 2–4 appear. The plan appears under Profile → My AI plans.

The browser return page never grants access. An interrupted verification can be retried: the backend reuses the PayPal capture and completes the saved entitlement transaction. Expired known orders can be replaced. An uncertain create attempt older than the conservative recovery window stops for administrator review instead of risking another order.

## Checks

```sh
# backend
cd backend
.venv/bin/python -m pytest -q
# Optional live provider tests (require keys; use synthetic requests / quota)
.venv/bin/python tests/eval_coach.py
# Optional Supabase test: creates and removes ONLY its own disposable test users
.venv/bin/python tests/integration_supabase.py
```

```sh
# frontend, in mobile/
npx tsc --noEmit
npm run lint
npx expo-doctor
npx expo export --platform web --output-dir /tmp/motionpay-web
npx expo export --platform ios --output-dir /tmp/motionpay-ios
```

CI runs backend tests, TypeScript, lint, and a web build. The optional live checks are excluded from CI because they need credentials. SQL account-isolation and concurrent-reservation checks have a dedicated opt-in integration script.

## Deploying for evaluation

Hosting is optional if complete setup instructions are supplied. To package the backend, build from the repository root with `docker build -f backend/Dockerfile -t motionpay-api .`; supply server environment variables through the hosting platform, not the image. Use HTTPS for a hosted app/API and one worker. Set CORS to the actual frontend origin and `PUBLIC_API_URL` to the hosted API. Publish the Expo web export separately or provide Expo Go / development-build run instructions. No deployment is created by this repository.

The included rate limiter is bounded and **single-process**, with a conservative shared network allowance (15 quota-consuming requests/minute and 500/day/IP, plus 90 general API requests/minute/IP). It does not trust forwarded-IP headers. Behind a proxy, callers may share a bucket. Before horizontal scaling or production traffic, replace it with shared Redis/edge quotas and a configured trusted-proxy policy. A single-process demo is not immune to distributed abuse.

## Honest limitations

- Sandbox payments only; the AI never initiates or approves payment. No real payment processing, refunds, chargeback reconciliation, or production webhook lifecycle.
- The fixed program and AI-built plans are prototype templates, not professionally reviewed or medical prescriptions. AI plans repeat the same weekly sessions with progressive guidance. No progress tracking; its unfinished tab is hidden.
- The 294 extended library entries have draft instructions written for this prototype and need review. Their artwork loads from a CDN and needs a connection. External tutorial relevance is filtered heuristically. Unknown matches may fall back to a search link.
- Chat stays in memory and uses at most 12 recent turns. It clears on account changes/restart; there is no cloud chat history.
- Password recovery needs configured web redirects and an actual email test. Phone-specific flows and production deployment require their own acceptance tests.
- AI model outputs can be wrong. Do not enter sensitive personal/medical information. See the app's Data and demo information screen.

## License and credits

Project code: MIT (`LICENSE`). Exercise artwork keeps its separate licenses, including CC BY-SA 4.0. See `THIRD_PARTY_NOTICES.md` and `mobile/ASSET_CREDITS.md`. The Expo starter license is preserved in `mobile/LICENSE`. Wikimedia GIFs are bundled with credits, and tutorial videos stay in official players; do not claim generated exercise footage.

Submission material drafts are in `submission/`. They must be checked against the final working build and uploaded by the project owner. Never commit `.env`, private keys, real credentials, or sandbox buyer passwords.
