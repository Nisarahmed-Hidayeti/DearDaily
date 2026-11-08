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

### Additional local abuse probe (not a passing release gate)

A local-only probe rejected 35 invalid signup-verification hashes, but did not return HTTP 429. The Auth container has `GOTRUE_RATE_LIMIT_VERIFY=30`; that configured value does not prove enforcement through the tested local route. Hosted rate-limit enforcement remains unverified and must be tested in a controlled way before opening general registration. No limits were increased or disabled.

## Hosted activation checkpoint — November 7

Owner approved rollout; PR #8 was merged as `33d947a` and Netlify published that production commit. The public Turnstile Site Key and Google flag are configured on Netlify, with signup false across deploy contexts. Site URL is now `https://deardailyy.netlify.app`; the exact live callback/reset redirects were added while retaining localhost.

Owner entered the Secret Key directly and reported saving. Read-only dashboard verification found CAPTCHA ON, provider Turnstile, and Save changes disabled (no pending edits). Two synthetic nonexistent-account password requests without a CAPTCHA token and with an invalid token each returned HTTP 400 / `captcha_failed`, with no session. Public settings still show signup disabled, email confirmation required, anonymous Auth disabled, and email/Google enabled.

Positive post-activation email/password login remains pending owner confirmation. Earlier successful live login was before server CAPTCHA activation and must not be substituted for that check. Fresh hosted registrations and hosted rate-limit enforcement remain pending; do not enable signup or describe general registration as ready.

### Post-activation sign-in failure diagnosis

Owner's fresh login failed after CAPTCHA activation. A read-only unified Auth-log query categorized recent rejections as CAPTCHA failures and then confirmed the provider subtype `invalid-input-secret`. This establishes an invalid configured Turnstile secret, not rejection of the submitted password for those attempts. The agent did not read the secret or reset any password. Cloudflare Edit Widget and Supabase Attack Protection were reopened for the owner to copy the Secret Key directly (not the public Site Key), replace it, and save. Correction and a successful post-correction login remain pending.

Local error UX now recognizes only allowlisted CAPTCHA/rate-limit error codes with fixed safe messages, rather than showing password guidance for every provider rejection. Arbitrary provider messages and account-existence details remain hidden. The focused auth suite passed 18 tests. This message improvement is local and not deployed; fixing the actual provider secret is the operational priority.

### Secret corrected and positive login confirmed

Owner reported correcting and saving the Turnstile Secret Key. Read-only UI confirmed CAPTCHA ON and no pending save. An additional invalid-token probe was denied. Owner then explicitly confirmed fresh sign-in works after activation/correction. This is owner-confirmed positive live-login evidence, not an agent-observed session in the separate normal browser. Hosted signup remains disabled; new-user email/Google tests and rate-limit enforcement are still pending.

## Protected hosted signup test stage — owner approved

Owner explicitly approved enabling new-user signup in deardaily-dev and localhost while keeping the public frontend closed, with the project API exposure explained. Targeted public-settings preflight confirmed email confirmation required and anonymous Auth off; the saved Turnstile switch was ON. Only Allow new users to sign up was enabled and saved. The API confirmed signup enabled with the other protections intact. `.env.local` signup was set true, without committing it or deploying anything. Live-site Create account and Google signup buttons were verified disabled with the closed notice.

Approved identities: `nisarahmedhidayeti+deardaily-beta@gmail.com` for email registration, and `deardailywebsite@gmail.com` for Google registration. No passwords are entered by the agent. Hosted registration/isolation tests remain in progress; this is not general-public release approval. Global API registration is open behind CAPTCHA/email confirmation during this explicitly approved stage.

### Fresh email account evidence

The approved email-alias account was created through the normal signup form (no administrator confirmation). Dashboard status changed from unconfirmed to confirmed after the owner opened the delivered verification email. Owner then signed in with the saved password; the development harness independently verified the SDK session and `getUser()` identity, required email confirmation and the exact approved email, and retained an isolated client only in memory. Authenticated ID receipt ends `f592a8e27b82`.

A preflight search found no existing `deardailywebsite@gmail.com` user before starting its Google registration. Local Google signup now explicitly requests account selection with only `openid email profile` scopes, avoiding accidental reuse of the owner's existing Google account. Google credential entry/consent is a user handoff; creation, second distinct session and hosted isolation checks remain pending. The first session remains in the open development verification tab.

The new development-only registration verification route is lazy-imported behind `import.meta.env.DEV`; it has no password fields, allows only the two approved confirmed identities, verifies both isolated sessions and rejects duplicate authenticated IDs before reusing the existing synthetic hosted privacy suite. Session snapshots are never serialized or printed and can be released through Clear test sessions. Unit regressions cover unconfirmed identity rejection, duplicate identity rejection and passing only verified sessions to the privacy suite.

### New Google registration and first hosted privacy run — November 8

The initial Google callback expired while the owner completed sign-in. The agent restarted OAuth, selected the now-authenticated approved DearDaily Google identity, and observed DearDaily's confirmed account page for `deardailywebsite@gmail.com`. The verification harness independently checked its confirmed email, Google identity and authenticated user ID. Email ID ends `f592a8e27b82`; new Google ID ends `87704d9a3745`. The identities are genuinely distinct.

The first hosted privacy run passed 31 checks, including private CRUD and cross-owner denial, then failed its old four-column public projection assertion. The application now deliberately returns additional approved rich-writing/public metadata fields. Exact synthetic fixture cleanup passed. Per the owner's failure boundary, hosted signup was switched OFF and verified closed; localhost's signup flag was also restored false. Existing confirmed test accounts remain intact.

The assertion was replaced with an independent fixed allowlist for the enabled interfaces, rather than deriving expected fields from production SELECT constants. Regression tests reject extra owner IDs, mood, private tags/date, joins, emails and version fields, and reject missing required fields. The corrected hosted rerun remains pending a refreshed email test session; the Google session is retained in development memory. The dev harness now preserves its memory-only captures across HMR updates (never serializes them).

### Corrected fresh-account gate — November 8

Both approved confirmed identities were recaptured and independently verified by Supabase. The corrected suite passed **54 hosted journal checks**, including distinct IDs, cross-owner denial, anonymous access boundaries, independent public snapshots and unpublishing. **47 hosted media checks** then passed with these same new accounts, including private asset isolation, approved public copies and revocation after unpublishing. Both suites reported exact synthetic fixture cleanup PASS. No hosted schema, Storage policy or authentication settings changed during the reruns.

The Google account also completed an actual local cloud-editor acceptance flow: create a disposable entry, backend-confirmed save, reload with title/body preserved, explicit anonymous publication confirmation, discovery in Explore, unpublish and delete the exact synthetic entry `8069a082-4fc7-4aa2-b789-ccfc000b6acd`. No real writing was used. Public signup remains closed on the hosted project, localhost and public frontend after the earlier failure rollback; passing reruns do not authorize reopening it.

Current checks: 211 frontend tests across 36 files passed; TypeScript, ESLint and production build passed. After adding the dev-only media-run control, TypeScript and the 12 focused harness/projection tests passed again. Existing 264 pgTAP and 35 local Auth integration checks remain valid; no database migration changed.

Remaining launch work: controlled hosted rate-limit enforcement evidence, Google general-audience readiness, remaining release/policy/operational review, and explicit approval for signup activation and any further deployment. The email account's external verification/login and Google's distinct new-account authentication are verified; no claim of completed public release is made. Test sessions are held only in the development tab's memory, never exported. Local code changes have not been pushed or deployed.

### November 8 release follow-up

Owner authorized pushing and deployment once requested work and checks are complete, with registration as first priority. A controlled hosted `/verify` probe used only random nonexistent signup hashes: 32 HTTP 403 responses followed by HTTP 429 on request 33, no sessions. No real OTP, email message, account or authentication setting changed. Verification rate limiting is now observed; do not generalize this to untested endpoint quotas.

Google Audience currently shows External / Testing, with Publish app disabled pending branding. Homepage/privacy/terms fields are empty. Public privacy and beta-terms routes were prepared locally, linked from the homepage and signup, and submitted to the owner for review before publishing. No Google audience/configuration changes were saved.

Account recovery instructions no longer claim delivery remains untested. Account sign-out now navigates home only on confirmed success, with two regression tests. Existing motion is shorter and card movement quieter; reduced-motion rules remain in place. All 213 frontend tests passed; TypeScript/lint/build passed. Loaded-theme browser checks verified 96 route/viewport combinations across all four themes with no horizontal overflow; original Midnight preference restored on the approved Google test account. Initial loading/fallback measurements were discarded from theme evidence. No claim of physical keyboard testing.

Docker is currently stopped and noninteractive startup requires a system password. Owner was asked to start it; previous pgTAP results are historical, not a fresh run. Signup stays closed pending the release steps in REGISTRATION_LAUNCH_GATE.md. No hosted schema/Storage changes, merge, push or deployment occurred in this follow-up.

### Approved beta publication checkpoint — November 8

Owner approved publishing the prepared privacy and beta-terms pages with deardailywebsite@gmail.com as contact, and started Docker. A fresh local pgTAP run passed all 264 checks across six files without resetting data or applying hosted migrations. Latest main was merged into the existing feature branch; the sole conflict was the evidence document's appended timeline, preserved in full. Source files were unchanged by the merge, so the 213-test/TypeScript/lint/build result applies to the resulting application code. Publishing these pages does not by itself enable signup or change the Google audience. Audio and optional public streaks are excluded and remain unfinished.

### Reviewed update deployed; activation pending

PR #9 merged after all GitHub checks passed as `a40937399b37854f84a31cc39d34c1050db4104b`. Netlify's dashboard verified this exact main commit published. Live `/privacy` and `/terms` render the owner-approved pages. No signup activation occurred: public settings still confirm disable_signup=true, email confirmation required, anonymous_users=false, and email/Google providers enabled.

Netlify production flags were inspected individually: journals, community, rich editor and Renaissance data are true; signup is false. VITE_ENABLE_MEDIA is absent, so upload activation remains pending despite passing the 47 hosted media checks. Google's live homepage/privacy/terms URLs and `deardailyy.netlify.app` authorized domain are prepared but unsaved. The owner has been asked for one grouped protected-beta activation approval covering those Google settings/audience, hosted signup and the frontend signup/media flags, with no database or Storage-policy changes. Stop on Google verification requirements or failed live tests.

### Approved activation attempt and fail-closed follow-up

Owner explicitly approved protected beta activation. Google branding URLs and the exact live authorized domain were saved; Google Audience now confirms In production. No additional verification was requested for this basic-profile configuration. Netlify production-only signup/media values were set true (other contexts false), and deploy `6aefe6af819df08b1dec63b7` published the already reviewed `a409373` application code. Hosted signup was deliberately kept OFF until live checks.

Live Google login with the approved DearDaily test identity returned to the confirmed account, and the real cloud editor displayed the enabled photo control. A synthetic PNG upload failed with `Photo upload not confirmed`, while all writing remained intact. The exact disposable entry `8f726bc1-a498-42d0-90cc-9f36dbd9d147` was deleted through its own confirmation and the app returned to /app. No real writing was used.

A credential-free gateway POST probe confirmed localhost reaches authentication rejection (401 Sign in required), while the live origin is rejected before authentication (403 Origin unavailable). OPTIONS alone was insufficient evidence: unknown origins receive a wildcard preflight, but POST still enforces the explicit origin allowlist. The deployed gateway defaults to localhost-only unless MEDIA_ALLOWED_ORIGINS is configured. Owner approval was requested to retain localhost and add exactly https://deardailyy.netlify.app; no gateway/Storage/RLS changes were made.

The in-app live Turnstile timed out, so a normal-browser existing-account login was requested rather than bypassing verification. Per the approved stop condition, hosted signup remained closed and both production frontend signup/media flags were returned false pending successful retests. Google login remains enabled. This is not a completed registration activation and must not be reported as open registration. Existing 213 frontend/264 pgTAP/54 journal/47 media results remain valid within their tested environments; the localhost media suite did not establish live-origin permission.
