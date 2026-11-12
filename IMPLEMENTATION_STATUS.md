# Reliability implementation — November 9, 2026

The audit's implementation work is complete for the sandbox prototype. This is not a certification of production reliability. The original audit remains as a record of the earlier state.

## Changes delivered

- One root repository layout, MIT code license, separate third-party notices, environment examples, Docker build, CI checks, and complete setup instructions. The previous mobile Git directory is preserved locally in an ignored backup.
- Durable checkout reservations and stable PayPal idempotency keys; expired-order recovery; transient-failure handling; validation before capture; atomic entitlement creation; account-linked purchase history; and saved-price display when resuming checkout.
- The explicitly approved checkout-recovery migration was applied successfully to the configured Supabase project.
- Correct current-media context for slowdown requests, direct catalog resolution for exact exercise requests, account-scoped chat reset, cancellation of stale requests, virtualized messages, a pinned composer, and a new-chat action.
- Bundled Wikimedia GIFs, playback controls, reduced-motion support, lazy media mounting, video fallback, and retained source/license attribution.
- Backend-driven product pricing, explicit ownership loading/error states, foreground checkout recovery, and exercise links in the unlocked four-week template.
- Native secure session storage with legacy migration, confirmation-email resend, a password-recovery route, privacy disclosure, and removal of misleading feature claims.
- Request/body/concurrency limits, tutorial caching, bounded GIF processing, sanitized request logging, dependency security updates, and reproducible lockfiles.
- Submission description, a device demo script, and a manual acceptance checklist.

## Verification completed

- Backend: 67 tests passed. Two upstream deprecation warnings remain in the test-client stack.
- Mobile: TypeScript and Expo lint passed; Expo Doctor passed all 20 checks.
- iOS and web production exports generated. A separate clean source copy passed npm ci, TypeScript, lint, and web export without local environment files.
- Python and full npm dependency scans reported no known vulnerabilities at the time checked. This does not guarantee absence of security flaws.
- Live disposable Supabase users verified reservation reuse, account isolation, restricted client writes/RPC access, and idempotent entitlement completion; disposable users were removed.
- An existing completed sandbox purchase still unlocked the four-week program and could be verified again without a new charge.
- Eight synthetic coach cases passed across quota-spaced runs. Exact catalog demonstrations now work without an LLM call.
- Browser checks confirmed exercise playback, pause, new chat, backend product pricing, guest program review, and sign-in routing.
- Publishable files passed a scan for the configured local server secrets. This is a scoped scan, not a comprehensive secret-history audit.

## Remaining acceptance and submission work

1. Follow submission/ACCEPTANCE.md on a physical phone, including a fresh sandbox buyer, cancellation/resume, app switching, sign-out/account switching, native secure-storage migration, and media playback.
2. Configure a reachable EXPO_PUBLIC_AUTH_REDIRECT_URL and the Supabase redirect allowlist, then test a real password-recovery email. The route is implemented; email delivery and native/device behavior are not independently verified.
3. Publish to the intended public repository and verify the public license/source/setup. No remote destination or public deployment was created automatically.
4. Record and upload the under-three-minute device demo and complete the submission form. Keep credentials and account details out of the recording.

## Deliberate sandbox limits

PayPal remains sandbox-only. Refunds, disputes, reversals, and production webhook reconciliation are not implemented. Expo Go checkout still supports manually returning to the app and tapping Verify payment; an installed build has a return link. In-process guest limits are intended for one backend worker; public scaling requires shared limits and a reviewed proxy configuration. The training template is a prototype, not a professionally reviewed or individualized program. Media coverage is limited to the documented catalog and external tutorial fallback. Load testing, a penetration test, and a comprehensive accessibility/device matrix have not been performed.

Use README.md for setup and submission/ACCEPTANCE.md for the final walkthrough.
