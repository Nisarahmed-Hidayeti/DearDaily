# Registration and Google sign-in — release gate

Registration forms, password confirmation (12–128 characters), neutral responses, recovery callbacks, PKCE OAuth, exact redirect origins and Turnstile integration are implemented. These code paths are not proof of hosted email delivery or Google login.

Public registration stays disabled. Google UI activation is independently gated by `VITE_ENABLE_GOOGLE_AUTH=false`; an unconfigured provider cannot present a working-looking button. Never place Google, SMTP or Turnstile secrets in frontend variables.

## Next development setup (approval required)

1. Create/select a Google Auth Platform application, External / Testing, with only approved testers. Create a Web application client. Add `http://localhost:5173` as a JavaScript origin and the callback displayed by **deardaily-dev → Authentication → Google** as its redirect URI. This is Supabase's callback, not the localhost application callback.
2. Enter its client ID and secret directly in Supabase's Google provider settings. Keep email confirmation on and public signup off. Do not disable nonce or email verification checks. Existing password accounts must remain usable; test identity linking rather than assuming matching email addresses imply the intended account.
3. Verify approved application redirects. Enable Google on localhost only for a real tester consent/callback/cancellation/logout test. Confirm identity and cross-user isolation. No live-site deployment is authorized.
4. Configure an approved SMTP sender and Turnstile server secret in Supabase only; the public Turnstile site key goes in frontend configuration. Review hosted password strength, rate limits and abuse controls before activation. Never add ordinary users to the Supabase organization to work around email delivery restrictions.
5. Test real verification and recovery delivery, expired/reused links, password reset, duplicate-account neutral responses, Google and password account interactions, session expiration and new-account ownership isolation using synthetic data.
6. Review moderation, privacy/terms, deletion workflow, quotas and recovery/backup readiness. Request separate approval to open hosted signup and the frontend flag, and separate approval for deployment.

## Current blockers

No verified Google OAuth client setup, real Google consent/callback test, SMTP delivery/recovery test or hosted CAPTCHA configuration is recorded for this release. No hosted authentication settings were changed by this work. Signup is not launch-ready.

## Official setup references

- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-captcha
- https://supabase.com/docs/guides/auth/redirect-urls

## Development Google checkpoint — 2026-10-30

Google Auth Platform project `deardaily-development` was created without billing activation. The owner created the web client and entered/saved its credentials directly in deardaily-dev. Dashboard verification showed Google enabled, email enabled, email confirmation on, public signup off, anonymous login off and manual identity linking off.

Google sign-in was enabled on localhost only via the ignored local environment file. The actual browser OAuth flow reached Google, the owner completed identity verification/consent, and DearDaily restored the existing confirmed account. Account access remained authenticated after a browser reload. This verifies one real Google login and reload persistence, not public-registration readiness. No journal content was modified or used as a fixture.

The final logout browser action timed out, so Google-session logout is not recorded as passed. Remaining checks include authenticated identity continuity against the previous account ID, Google-session A/B isolation, logout, cancellation/error callbacks and hosted basic-profile-only consent review. Real email verification/recovery delivery, CAPTCHA and launch protections remain required. No website deployment or public signup activation occurred. No OAuth secrets are stored in the repository.
