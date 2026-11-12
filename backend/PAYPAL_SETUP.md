# Sandbox checkout

The API is hard-coded to PayPal sandbox; this build cannot charge real money.

## Configure

1. Add `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from the PayPal **sandbox** app to `backend/.env`.
2. Add `SUPABASE_SERVICE_ROLE_KEY` from your project's server API keys to `backend/.env`. This is used only by the backend to record purchases and grant access. Never put it in mobile env files or a public repo.
3. Run `supabase/migrations/202611090002_complete_purchase.sql` and then `202611090003_checkout_recovery.sql`, each once in Supabase SQL Editor after the previous migrations. It adds a service-only atomic completion function, prevents multiple pending checkouts per user/program, and enables the sandbox program.
4. Set `PUBLIC_API_URL` to a backend URL reachable by the checkout browser. On your phone, use your computer's Wi-Fi IP on port 8000 (same Wi-Fi); also set mobile `EXPO_PUBLIC_API_URL` to that URL. A deployed backend should use HTTPS.
5. Restart FastAPI after changing environment variables, and restart Expo after changing mobile env values.

## Test on phone

1. Sign in to MotionPay and open Beginner Strength Essentials.
2. Tap Continue to PayPal. Use your sandbox **personal buyer** account from PayPal Developer > Testing Tools > Sandbox Accounts, not your real PayPal account or seller account.
3. Approve the sandbox purchase. Return to MotionPay manually and tap Verify payment. The return page itself does not capture or grant access.
4. Open your program. Close/reopen it and verify access persists.
5. Test a different account cancelling checkout: Verify payment must keep it locked. Different users cannot verify or open another user's purchase.

## Implementation

Order creation reads the active program's price/currency from the server database, not from mobile input. Capture requires a Supabase-verified account and a matching stored order. The backend verifies order status, capture status, amount, currency, order ID and account/program association. A service-only database function atomically records capture and grants access. Repeated verification of a completed order reads PayPal's existing capture without charging again. A storage failure after capture can be recovered by retrying verification.

The sample four-week template is served only from the authenticated content endpoint after checking the entitlement. Free exercise media remains public. This is a sandbox prototype: refunds, revocation, webhooks, production commerce, automatic Expo Go return, and a professionally reviewed training program are outside this implementation. Judge access and hosting still need preparation.
