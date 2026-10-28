# Current setup checkpoint — October 28, 2026

The development environment now has real URL/publishable-key values and successful connectivity. Docker/local migration testing passed all 71 pgTAP checks. The account schema was applied to deardaily-dev with explicit approval; hosted RLS and anonymous denial were verified, and Advisor Center reported no issues. Hosted signup is disabled, email login is enabled, email confirmation is required and Google is disabled. The dashboard-applied migration has not been registered in the CLI ledger: obtain approval to reconcile history before any db push. Real tester authentication and two-account isolation remain pending. Instructions and earlier blockers below include historical notes; do not repeat completed setup or reapply the CREATE migration. See VALIDATION.md for the current verified report.

---

# Phase 2 local foundation: setup and verification

The owner has created `deardaily-dev` on the Free plan in Paris. The local `.env.local` exists and is Git-ignored, but its URL/key values are placeholders, not a working connection. Authentication, email delivery, Google OAuth, and cross-device synchronization are **not verified integrations**. Registration is closed by default. This document describes the remaining work; it does not record completed setup.

## 1. Run the frontend without a backend

Use Node 22.12+ and run:

```bash
npm ci
npm run dev
```

The sample dashboard, in-memory editor, stories, and guest themes remain available. Auth pages explain that account services are not configured. No credentials are needed for the demo.

## 2. Start an isolated local Supabase stack

Install and start Docker using its official distribution for your OS. The project pins the Supabase CLI as a development dependency.

```bash
npm run db:start
npm run db:reset
npm run db:test
npm run db:stop
```

These commands target the **local** stack, not a hosted project. Local reset destroys local test data: do not use it for data you need to preserve. No command in this repository links or resets a hosted project automatically. The GitHub verification workflow runs the same isolated stack and tests without hosted credentials.

The migration is in `supabase/migrations/20261027000100_account_foundation.sql`. Tests are in `supabase/tests/database/account_rls.test.sql`; all fixtures roll back. Local defaults deny new signups, require email confirmation, disable anonymous sign-in, and use 12-character minimum passwords.

Copy `.env.example` to `.env.local`. Use the local API URL and **publishable** key printed by your current CLI. Do not copy the secret key, service-role key, JWT signing secret, or database password. The frontend intentionally rejects legacy JWT keys. Never paste the full CLI status output into an issue or public log.

To exercise signup in an isolated local test stack, explicitly enable local `auth.enable_signup` and `auth.email.enable_signup`, restart the local stack, and set `VITE_ALLOW_SIGNUP=true` in your untracked local environment. This is only for a controlled local test; do not commit those changes or enable hosted public signup. Mailpit captures local confirmation/recovery emails. Restore signup restrictions afterward.

## 3. Connect the existing development project

Use the existing **deardaily-dev** project; do not create a replacement or connect a production journal database. In Supabase Dashboard, select **deardaily-dev**, open **Connect** and copy the Project URL, then open **Settings → API Keys** and copy the **Publishable key**. Replace the corresponding values in the local `.env.local` using your editor; never paste credentials into chat. Restart Vite after saving. Dashboard labels may vary; the official Connect dialog also provides the client URL/key.

1. Record its URL and publishable key in `.env.local`:
   - `VITE_SUPABASE_URL=https://<development-project-ref>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`
   - `VITE_ALLOW_SIGNUP=false`
2. Keep “Allow new users to sign up” disabled in Auth settings for a closed beta. The Vite flag only hides the signup UI; it is not an access-control mechanism. Google sign-in can otherwise create new accounts, so the server restriction is essential.
3. Keep anonymous sign-in and manual identity linking disabled. Enable email confirmations, secure email changes, refresh-token rotation, and a password minimum of 12 characters. Review password strength, leaked-password protection availability, session settings, and rate limits.
4. Configure a verified SMTP sender and appropriate delivery limits before testing real email. Default SMTP has testing restrictions.
5. Apply the committed migration to this development project with the CLI, reviewing the target and migration first:
   ```bash
   npx supabase login
   npx supabase link --project-ref <development-project-ref>
   npx supabase db push --dry-run
   npx supabase db push
   ```
   Credentials are entered through the CLI, never committed or exposed through Vite variables. Do not run these commands against production without separate approval.
6. Open Supabase Security Advisor and resolve findings. Confirm RLS and grants on both tables. The local test suite does not replace an advisor review of the actual project.
7. Provision only authorized testers. Approval is required before enabling hosted signup. To verify the actual signup flow, use an approved, isolated test environment and restore signup restrictions afterward.

No provisioning trigger reads untrusted auth metadata. Profiles are created on the user's first explicit profile save; settings are initialized after login only if absent.

## 4. Exact redirect allowlist

Set the Site URL to the exact environment being tested. Add **only** the appropriate exact URLs below to Supabase Auth redirect settings; do not use wildcard Netlify domains or arbitrary preview URLs.

- `http://localhost:5173/auth/callback`
- `http://localhost:5173/auth/reset-password`
- `http://127.0.0.1:5173/auth/callback`
- `http://127.0.0.1:5173/auth/reset-password`
- `http://localhost:4173/auth/callback`
- `http://localhost:4173/auth/reset-password`
- `http://127.0.0.1:4173/auth/callback`
- `http://127.0.0.1:4173/auth/reset-password`
- `https://deardailyy.netlify.app/auth/callback`
- `https://deardailyy.netlify.app/auth/reset-password`

The application enforces the same origin allowlist before initiating a redirect. Post-login navigation accepts only known account/settings paths. For a new approved domain, review and update both application and Supabase allowlists.

PKCE uses tab-scoped session storage. Open confirmation/recovery links in the **same browser and tab** where the request began. A fresh tab/browser may lack the verifier and must request another link. Reloaded normal sessions restore within the same tab; closing it ends local persistence. A recovery session must be established by the SDK's PASSWORD_RECOVERY event; simply visiting the reset page while signed in does not permit a reset.

## 5. Google OAuth

Create a Google OAuth web client for the development Supabase project:

1. In Google Cloud Console select the development project, then open **Google Auth Platform → Branding** and complete app name, support email, and developer contact. Open **Audience**, choose **External**, keep publishing status **Testing**, and click **Add users** under Test users to add only approved testers.
2. Open **Google Auth Platform → Clients → Create client**, choose **Web application**, and name it DearDaily development. Under **Authorized JavaScript origins → Add URI**, add `http://localhost:5173` (add the live origin only after deployment approval).
3. Under **Authorized redirect URIs → Add URI**, paste the callback shown in **Supabase → Authentication → Sign In / Providers → Google**, then click **Create**. It has the form `https://<development-project-ref>.supabase.co/auth/v1/callback`. This is the **Supabase** callback, distinct from DearDaily’s application callback.
4. After approval to change security-sensitive settings, open **Supabase → Authentication → Sign In / Providers → Google**, enable the provider, enter the Google client ID and client secret **in Supabase Dashboard only**, and click **Save**. Keep new-user signup disabled in Supabase; Google testing mode alone is not the application registration boundary. Existing tester Google identities must be provisioned through an approved flow before testing; email-only tester creation does not prove Google identity setup.
5. Request only `openid email profile` for login. No Google Drive, Calendar, offline access, or unrelated scopes are requested.
6. Keep provider identity linking under Supabase's verified-identity rules. Test existing email/provider combinations; do not add custom linking logic.

The Google client secret must never be a `VITE_*` variable.

## 6. Netlify environment

When the development project is configured and approved for connection, set the two public frontend variables in the intended Netlify deployment context. Keep `VITE_ALLOW_SIGNUP=false`. Vite embeds these values at build time, so rebuild after changing them. Do not set database passwords, Supabase secret keys, or service-role keys in frontend variables.

The existing site is `https://deardailyy.netlify.app/`. Do not connect it to a production backend as part of this foundation. Its SPA rewrite covers auth and account routes. Headers disable referrers, framing, MIME sniffing, and auth-route caching; verify the deployed response headers after rollout. Changing Supabase/Netlify dashboard settings is a separate manual step, not something this implementation performed.

## 7. Manual integration checklist (must be recorded as actual results)

Use two authorized synthetic test accounts and a third anonymous browser:

- [ ] Signup returns neutral confirmation; email verification succeeds in the initiating tab.
- [ ] Unverified credentials cannot sign in.
- [ ] Duplicate addresses and Google/email overlaps do not disclose account state.
- [ ] Google OAuth succeeds; cancellation and expired callbacks show safe errors.
- [ ] Recovery email reaches the tester; expired/reused/wrong-browser links fail safely.
- [ ] Password update succeeds only through recovery; account access works afterward.
- [ ] Reload restores the session; expired sessions do not show account content.
- [ ] Sign-out clears account state and returns to the public site; offline failure is clearly reported.
- [ ] Account A/B cannot read or mutate each other's rows via direct API calls.
- [ ] Existing cloud themes win over guest themes; two devices converge on focus or within 30 seconds while visible.
- [ ] Offline settings changes do not claim success or overwrite cloud data.
- [ ] Direct route refreshes work on the configured Netlify URL.
- [ ] Security Advisor reviewed; rate limits and SMTP configured.
- [ ] Database tests pass; backup/restore and launch privacy requirements reviewed.

Do not mark Phase 2 complete or ready for a closed beta until the relevant checks pass.

## Official references

- [Password-based Auth](https://supabase.com/docs/guides/auth/passwords)
- [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database testing](https://supabase.com/docs/guides/database/testing)
- [Netlify SPA redirects](https://docs.netlify.com/manage/routing/redirects/redirect-options/)

## Current local blockers (October 27, 2026)

- Docker is not installed (`docker` not found). `npm run db:test` fails with connection refused on local port 54322. Migration execution and pgTAP results remain unverified. Install Docker Engine using the [official Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/) if this is Ubuntu, or choose the matching distribution from Docker documentation. Start Docker and verify `docker info` succeeds before `npm run db:start`. Docker access grants substantial host privileges; do not change socket permissions to world-writable.
- Replace the placeholder URL/publishable key in `.env.local` as described above. No real key or project identifier was printed or committed during inspection.
- No hosted migrations, signup changes, OAuth configuration, SMTP changes, or deployment have been performed. The committed migration creates only private profiles/settings, owner-only CRUD policies, limited column grants, constraints, and a timestamp trigger. Before applying remotely, review it and obtain approval for **deardaily-dev** specifically.
- Read-only connection checks could not reach a working project with the placeholder configuration. No hosted user A/B tests, email delivery, Google login, or cloud synchronization results can be claimed.

## CachyOS verification update — October 28, 2026

The Docker blocker above is historical and resolved. Docker Engine 29.9.2 was installed using `sudo pacman -Syu docker` and the service started. `hello-world` passed. Group membership was activated for testing through a `newgrp docker` child shell; no desktop logout or socket permission change was needed. After a normal logout/login, the app will inherit the new group membership.

For database security tests alone, use `npx supabase db start`, then `npx supabase test db`, then `npx supabase stop`. The first command applied the migration successfully to a fresh local database. All **71 pgTAP checks passed**. The test transaction left no profile/settings fixtures behind. The database was stopped after testing and its volume preserved.

The full stack is only needed for Auth/API/email integration; downloading its additional images is separate from successful database-only testing. Hosted configuration and integration checks remain pending, and the local frontend URL/key still need real values. No hosted database or registration settings were changed.
