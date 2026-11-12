# Account setup

1. Create a Supabase project. Copy its project URL and **publishable** key from the Connect dialog / API settings. Never put a secret or service-role key in the frontend.
2. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `mobile/.env.local`.
3. Set the same values as `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `backend/.env`.
4. Enable email/password authentication in Supabase Auth. Configure the confirmation Site URL to a reachable page you control. Users confirm their email, then return to the app and sign in with their password; confirmation-link sessions are not consumed by the app. Alternatively, create an email-confirmed test user in the dashboard. Do not commit passwords.
5. Run the SQL migrations in filename order in the Supabase SQL Editor, once per project, or through your configured CLI migration workflow. These migrations have not been applied by this change.
6. Restart Expo and FastAPI to load environment values.

## Verify

- Create an account and confirm the email if required. Sign in: Profile should display your email.
- Refresh/reopen the app: the session should be restored. Sign out: Profile should show guest status.
- Invalid credentials must leave the user signed out.
- `GET /api/me` without a bearer token returns 401. With a valid Supabase access token, the backend asks Supabase to verify identity and returns the user UUID. Never log or commit tokens.
- Signed-in database clients may read only their own purchase/access rows. No client may insert or update them.

The initial purchase migration creates tables with an inactive sample program. The subsequent completion migration enables sandbox checkout and adds a service-only atomic completion function. See `backend/PAYPAL_SETUP.md` for payment configuration and testing.

Native session persistence uses chunked Expo SecureStore and migrates existing AsyncStorage sessions; browser sessions use browser storage. Guest browsing remains available. Google sign-in and password recovery are not implemented and their placeholder controls were removed.
