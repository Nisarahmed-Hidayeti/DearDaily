# DearDaily Phase 2 hosted account migration report

Verified October 28, 2026. Status: account schema applied and checked; Phase 2 authentication integration is still incomplete.

## Target and authorization

The signed-in dashboard identified **deardaily-dev**, Paris region. Its project reference matched the Vite-loaded development URL (credentials were not printed). The user explicitly approved only the reviewed account migration.

Preflight catalog inspection found no public tables/views, no `supabase_migrations.schema_migrations` table, and no conflicting `public.touch_account_updated_at()` function. No existing data was reset, deleted, or overwritten.

## SQL applied

Source: `supabase/migrations/20261027000100_account_foundation.sql`, unchanged from the committed locally tested version. SHA-256:

`902ec29e1f922db30b04f10328e0980eee3d241c0c4949a86876b885db3534dc`

The editor payload matched that hash before execution, and the complete staged editor text matched the payload plus BEGIN/COMMIT transaction wrappers. Execution returned **Success. No rows returned.**

Created only profiles/user_settings, ownership and value constraints, eight owner-only policies, restricted grants, the hardened timestamp function, and its two triggers. No journal storage, test accounts, publishing, deployment, or authentication configuration changes occurred during this migration.

## Verification results

| Check | Result |
| --- | --- |
| Both account tables exist | Passed |
| RLS enabled and forced on both tables | Passed |
| Four policies and one timestamp trigger per table | Passed |
| Anonymous SELECT/INSERT/UPDATE/DELETE table privileges | All denied by catalog check |
| Authenticated ownership-column UPDATE | Denied on both tables |
| Authenticated timestamp INSERT/UPDATE | Denied on both tables |
| Primary key, foreign key and value constraints | Six relevant constraints present |
| Timestamp function | Security invoker, empty search path; anon/authenticated EXECUTE denied |
| Tables contain no records | Passed |
| Anonymous HTTP read of each table | Both HTTP 401, PostgreSQL code 42501; no records returned |
| Advisor Center, filters cleared | No issues detected at inspection time |
| Hosted signup restriction | Still disabled |
| Email login / confirmation | Enabled / required |

The 71 pgTAP tests passed earlier against local Supabase PostgreSQL. They were not rerun against the hosted database, and no hosted fixture accounts were inserted. One supplemental read-only query initially failed because the editor retained part of a previous query; after replacing and verifying the complete query, all five supplemental checks passed. No data was changed by that failed read-only query.

## Remaining work and limits

- Apply method: dashboard SQL Editor. The CLI migration ledger was absent and was deliberately not created or modified. Before any future `db push`, reconcile the applied version with CLI history under separate approval. Do not rerun this CREATE migration against the existing tables.
- Two real tester accounts and HTTP/JWT cross-account isolation have not been verified. Local pgTAP and hosted catalog checks do not replace this integration test.
- Google remains disabled. OAuth client setup, exact localhost callback/recovery redirects, tester provisioning, SMTP delivery, confirmation/recovery, session restoration, logout and cloud theme synchronization remain to be verified.
- Advisor Center is a point-in-time diagnostic result, not a guarantee of complete security. No warning fixes or other settings were applied.
- Keep public registration disabled, use synthetic account data, and keep real journal storage out of scope. Phase 2 must not be called complete yet.

---

# Approved hosted signup restriction — October 28, 2026

Verified the signed-in dashboard project name deardaily-dev and Paris region. With explicit user approval, changed only Allow new users to sign up from enabled to disabled and saved. Confirm email remained enabled, Email provider remained enabled, anonymous sign-ins and manual linking remained disabled, and Google remained disabled. Read-only Auth settings returned HTTP 200 with disable_signup=true, external.email=true, mailer_autoconfirm=false. A synthetic public signup request was rejected with HTTP 422/signup_disabled; no user was returned. Existing-user login is configured to remain available; a real-account login has not been executed.

No database migration, deployment, provider enablement, or other hosted setting change was performed. Earlier enabled-signup observations below are historical. Two-account authentication/isolation tests remain pending.

---

# Hosted read-only verification — October 28, 2026

The current Vite-loaded `.env.local` now contains a non-placeholder hosted URL and a publishable key with valid format. Supabase accepted the key: GET Auth settings returned HTTP 200. The file remains Git-ignored and VITE_ALLOW_SIGNUP=false. No credentials or project identifier were printed. Public endpoints do not establish the dashboard project name; confirm deardaily-dev before administrative changes.

Observed hosted state:

- **Signup is enabled** (`disable_signup=false`). This violates the intended closed-beta server restriction; the frontend flag does not close the API. Approval is requested before disabling new-user signup.
- Email provider enabled; email auto-confirm disabled, so email confirmation is required.
- Google provider disabled.
- Anonymous GETs for profiles and user_settings both returned HTTP 404/PGRST205 (table unavailable in the API schema cache). This is not evidence of working RLS and does not prove either table is absent from every database schema.

No hosted writes, auth-setting changes, migrations, login/signup/recovery requests, or deployments were performed. Real two-account isolation and browser flows remain pending. Earlier placeholder notes below are historical. Phase 2 is incomplete.

---

# Local database verification — October 28, 2026

Docker Engine 29.9.2 is installed on CachyOS. `hello-world` passed. The current desktop process still has old group membership; a `newgrp docker` child shell successfully grants the registered Docker group access without logging out or changing socket permissions.

No pre-existing containers or volumes were present before setup. Full-stack downloads were interrupted intentionally to use the smaller Postgres-only workflow. `npx supabase db start` completed successfully and applied `20261027000100_account_foundation.sql` to the new local database. No reset or existing-data deletion was needed.

`npx supabase test db`: **PASS — 71 tests in one file**. Coverage includes anonymous/user A/user B access, own CRUD, cross-account read/update/delete denial, insert spoofing, ownership immutability, invalid themes, restricted timestamp writes, missing/malformed/unknown identities, and Auth deletion cascades. Tests roll back; direct post-test checks found zero profile/settings rows. Direct catalog inspection confirmed both RLS enabled and forced on both tables; the migration version is recorded locally.

These are real local PostgreSQL/pgTAP results. They do not verify hosted RLS, HTTP/JWT gateway integration, Google OAuth, email verification/recovery, or cross-device behavior. No hosted migration, signup change, or deployment occurred. Frontend environment placeholders remain unchanged. The full Auth/API stack was not started.

The local database was stopped after testing, preserving its volume, to avoid leaving its published port listening. No `--no-backup` cleanup was used. Reopen the app after desktop login to inherit Docker membership normally; alternatively use a `newgrp docker` child shell.

## Repeat database-only checks

From the repository directory, with Docker access:

```bash
npx supabase db start
npx supabase test db
npx supabase stop
```

Startup reuses the local volume. For future new migrations, review and apply explicitly with the CLI local migration command; do not reset data you need. Never use hosted database commands without target review and approval.

---

# Phase 2 resumption validation — October 27, 2026

Branch: `feat/deardaily-phase-2`, starting commit `aeb2a47`. Existing uncommitted README, design/roadmap, Netlify, Vite, and setup/security documentation changes were preserved. The Phase 1 record below is historical.

## Current checks

Baseline: TypeScript, ESLint, all 63 tests across eight files, and production build passed. After the logout lifecycle fix, the suite adds three regression cases: stale successful logout, stale failed logout, and token refresh after failed logout. Final rerun: TypeScript, ESLint, all **66 tests across eight files**, production build, and `git diff --check` passed. SDK/component tests use mocks and do not establish live integration.

Static SQL review: both application tables enable and force RLS; all eight owner-only CRUD policies are present; ownership/timestamp update privileges are withheld; insert IDs are checked against JWT identity; foreign keys cascade; theme/name constraints exist. The transactional pgTAP suite covers anonymous, user A, user B, missing/malformed/unknown identities and negative mutations. These are reviewed test definitions, **not executed results**.

`npm run db:test` failed: local PostgreSQL connection refused at 127.0.0.1:54322. Docker is missing. Migrations and pgTAP remain unverified; no hosted migration was run.

`.env.local` exists and is ignored, but Vite-loaded values contain placeholders and the key fails frontend validation. Read-only hosted probes could not connect (DNS lookup failed). Hosted registration restrictions, schema/grants, providers, email delivery, OAuth, session restoration and two-user API isolation remain unverified. The Vite signup flag is closed; this does not prove hosted signup is disabled.

No credentials were printed, no remote settings changed, no deployment/merge performed. Phase 2 remains blocked on valid development configuration, database tests, and manual integration validation. See SUPABASE_SETUP.md for exact next steps.

---

# Phase 1 polish validation

Verified October 27, 2026, with Node.js 22.23.2.

## Automated checks

| Command             | Result                            |
| ------------------- | --------------------------------- |
| `npm run typecheck` | Passed                            |
| `npm run lint`      | Passed, no warnings               |
| `npm test`          | 25 tests passed in 4 files        |
| `npm run build`     | Passed; 1,961 modules transformed |
| `git diff --check`  | Passed                            |

Production output: HTML 0.70 kB (0.41 kB gzip), CSS 39.62 kB (9.50 kB gzip), JavaScript 293.98 kB (93.01 kB gzip). No new dependencies were added during this polish pass.

Existing integration coverage includes landing/CTA navigation, fictional dashboard data, empty journal state, title/body input and word count, private default, mood/tag interactions, blocked save/publish, Explore filtering/details, temporary-draft clearing after navigation, 404, and honest authentication messages.

New coverage checks all four theme selections and restoration, global theme retention across routes, native keyboard radio selection, invalid/blocked storage, theme-only persistence while writing private text, view transitions with reduced motion on/off, dated heatmap ordering and descriptions, and local date formatting.

The four date/heatmap tests also passed separately under both `TZ=America/Los_Angeles` and `TZ=Pacific/Auckland`, confirming day alignment on opposite UTC offsets.

## Responsive browser checks

Measured 72 combinations in the in-app browser:

- Themes: Midnight Purple, Forest Green, Paper White, Obsidian Black.
- Routes: `/`, `/app`, `/app/write`, `/app/settings`, `/explore`, `/explore/long-way`.
- Actual CSS viewport widths: 360px, 768px, 1440px.

Every combination stayed within the document viewport width. In all 12 dashboard combinations, the heatmap measured exactly 12 columns × 7 rows, 84 cells at 12×12px, and 4px horizontal/vertical gaps. Cells retain chronological ordering; the scroll region is keyboard focusable.

Visually reviewed desktop Settings, Paper White dashboard, Forest Green story detail, Obsidian mobile editor, Midnight mobile dashboard, and the tablet landing page. Reviewed theme selection feedback and mobile/tablet/desktop navigation. Browser console checks returned no warnings or errors.

Production-preview direct visits followed by reloads passed on `/app/write`, `/app/settings`, and `/explore/long-way`. Netlify configuration contains the build/publish settings and non-forced status-200 SPA rewrite. Actual Netlify infrastructure has not been deployed or tested; verify these same routes on the deployed URL.

## Palette contrast

WCAG relative-luminance calculations on the source palette tokens gave these minimum ratios. Text includes primary, muted, accent, and emphasis against canvas, elevated, surface, and sidebar. Button checks cover gradient endpoints, hover, and accent; focus checks cover the four base surfaces.

| Theme           | Text minimum | Button label minimum | Focus minimum |
| --------------- | ------------ | -------------------- | ------------- |
| Midnight Purple | 6.59:1       | 5.68:1               | 10.36:1       |
| Forest Green    | 7.32:1       | 7.22:1               | 11.21:1       |
| Paper White     | 5.10:1       | 6.76:1               | 5.89:1        |
| Obsidian Black  | 7.42:1       | 8.74:1               | 14.69:1       |

All text pairs exceed 4.5:1; all focus pairs exceed 3:1. Decorative heatmap colors also carry textual date/activity descriptions rather than relying on color alone.

## Scope and limits

No backend authentication, persistent journals, live publishing, or Supabase integration exists. Only the selected theme preference is stored locally. Theme animation uses progressive enhancement; unsupported browsers switch immediately. Reduced-motion behavior is covered by provider tests and CSS overrides, but this review is not a full assistive-technology or cross-browser certification. Fonts use Google Fonts with system fallbacks.
