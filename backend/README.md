# MotionPay API

The authoritative setup, environment table, startup commands, and test instructions are in [the root README](../README.md). Use Python 3.12 and install requirements.lock. The API implements AI exercise chat, optional video lookup, Supabase identity checks, and PayPal sandbox purchases with protected program content.

See [PAYPAL_SETUP.md](PAYPAL_SETUP.md) for checkout specifics. Apply all migrations in filename order exactly once. Use one worker; the demo rate limits and provider caches are process-local. No real-money checkout is enabled.
