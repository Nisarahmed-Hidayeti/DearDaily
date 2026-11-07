# Authentication activation plan — November 7

Status: NOT ACTIVATED. No hosted CAPTCHA, signup, redirect, production environment or website deployment changes have been applied by the current work.

## Prepared locally

- Real Cloudflare Turnstile completed on localhost; the public Site Key is in ignored `.env.local` only. The Secret Key was never read or stored by the agent.
- Existing-owner Google OAuth and logout passed. Owner confirmed delivered recovery code, password update and subsequent password login.
- Email signup and Google signup remain blocked by the frontend flag and hosted global signup setting.
- The retry UI never manufactures verification: the form needs a provider token, and hosted Supabase must independently verify it after activation.

## Ordered, separately approved rollout

1. Review the auth-only code changes (recovery code navigation, session persistence, Turnstile loading/error/expiry/retry behavior) and pass local registration, frontend, lint, typecheck and build checks. Preserve unrelated editor changes.
2. With deployment approval, ship a compatible login/recovery build on `https://deardailyy.netlify.app`: configure the public `VITE_TURNSTILE_SITE_KEY`, `VITE_ENABLE_GOOGLE_AUTH=true`, and keep `VITE_ALLOW_SIGNUP=false`. Never place the Turnstile secret or privileged Supabase key in Vite/Netlify frontend variables. Verify the deployed forms actually render Turnstile before the next step.
3. With hosted-auth approval, set deardaily-dev Site URL to `https://deardailyy.netlify.app`, retain the existing localhost callback/reset redirects and add exactly `https://deardailyy.netlify.app/auth/callback` and `https://deardailyy.netlify.app/auth/reset-password`. Confirm Google remains enabled with nonce/email checks intact and email confirmation stays ON. No wildcard redirects.
4. Owner enters the widget Secret Key directly into Supabase → Authentication → Attack Protection, provider Turnstile, and saves only after the compatible website is ready. This changes protection for existing password sign-in and recovery too. Verify valid login/recovery succeeds and missing/invalid verification tokens are rejected. Do not weaken protection to make tests pass.
5. Review Google consent audience. A Testing app permits designated Google testers only; it must not be advertised as generally available Google registration. New Google account creation needs a genuinely unused, controlled identity and must not be claimed from an existing user's login.
6. Opening hosted signup is project-wide even if the website flag stays false: the public project API could accept new accounts. Obtain explicit approval for that exposure and the external-delivery/new-account test stage. With email confirmation ON, anonymous Auth OFF and CAPTCHA active, test fresh email and Google registration, public-profile opt-in, journal/media ownership, account switching and recovery with exact synthetic fixtures. Public signup must not be described as verified until these hosted tests pass.
7. Only after passing and owner approval, deploy `VITE_ALLOW_SIGNUP=true`. Review privacy/terms, operational quotas, moderation coverage and recovery/backup gaps before general public launch.

## Rollback

If hosted new-account tests fail, close hosted signup and keep the frontend flag false. Do not delete real users or journals. If a compatible auth build has to be rolled back, coordinate CAPTCHA compatibility so the older build does not silently lock users out. No automatic security weakening or rollback is authorized by this document.

No database migration, Storage policy change, payment, Google secret rotation or unrelated feature activation is part of this rollout.

## Final local evidence

- 196 frontend tests across 34 files passed.
- 264 database pgTAP checks passed; existing local database restored from its retained backup, with no reset or hosted migration.
- 35 real local Auth/API checks passed: two fresh distinct accounts; confirmation required; real captured local confirmation/recovery mail; single-use confirmation/recovery links; login/logout; journal save and reload; both directions of cross-owner read/update/delete denial; ownership spoof rejection; anonymous journal/Auth denial; old password rejection and new password success after recovery. Exact synthetic user, journal and captured-mail IDs were cleaned.
- Local signup was temporarily enabled for this local-only run, then the original configuration was restored and runtime `disable_signup=true` verified. Frontend `.env.local` still targets the hosted project with signup false. Local mail capture does NOT prove external registration email delivery or Google signup.
- TypeScript, ESLint, production build and whitespace checks passed.
- `scripts/test-local-registration.mjs` accepts only CLI status JSON for `http://127.0.0.1:54321` and mail capture `http://127.0.0.1:54324`. Run it only with locally enabled signup and email confirmation; never supply hosted credentials. Keep the CLI-generated status file private and clear it after testing. Do not run a database reset for this test.

Remaining acceptance: hosted CAPTCHA enforcement and missing/invalid-token denial, fresh external-email signup/confirmation, new Google-user signup, live redirects, and authenticated hosted isolation checks for those new accounts. These require the rollout approvals above; no general-public readiness claim is made.
