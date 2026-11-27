# Engineering progress

## 01 · Production baseline (2026-11-26)

- **Implemented:** Reused the loopback-only voice integration fixture in CI and extended it with edit/reopen, signed-out story snapshot, and unpublish checks. Added a read-only hosted probe. No product, schema, or production configuration changes.
- **Baseline identity:** GitHub main was `b440d4d9927f246581371ceb3e4c7305ff76e41f`. Netlify recorded that exact revision as published on the Netlify hostname (deploy `6b047334b8dd4ecfa5615475`). The requested `deardaily.com` returned HTTP 302 to HugeDomains. Custom-domain ownership and DNS configuration were not verified.
- **Recent release scope:** #79 editor save churn, #80–82 audio approval and copy completeness, #83 cover previews and storage inventory, #84 audio quotas, #85 draft recovery and library loading. Reviewed migrations and checked the repository feature flags and hosting rules. Hosted Supabase migration history, gateway revision, and secrets remain unverified.
- **Locally verified:** Netlify host returned the app shell on 12 routes and served 14 linked/PWA assets. PWA static check passed. The same HTTP probe correctly rejected the custom domain. HTTP shell checks do not exercise client-side route resolution or Supabase requests.
- **Coverage boundary:** Existing frontend suites cover editor lifetime and formatting, autosave, photos, covers, audio UI, publishing consent, public profile, and appearance. Live authentication and guest/editor actions, private journal, published-story management, privacy controls, mobile navigation, console/network behavior and offline navigation remain pending browser checks. Browser transport failed and no dedicated hosted test credentials were available. No personal entries were opened or used.
- **CI / deployment:** Check the assignment PR for CI outcomes. Hosted product behavior is unchanged by these test and documentation files. The requested production hostname remains blocked.
- **Rollback:** Revert the assignment merge through a new PR to remove the probes and CI step. No database rollback is needed.

### Repeat the checks

- Hosted HTTP and assets: `node scripts/check-hosted-baseline.mjs https://deardaily.com`. Pass an explicit Netlify hostname to verify that host separately.
- Static PWA checks: `node scripts/check-pwa.mjs`.
- Isolated stack only: start and migrate disposable local Supabase, run `npm run db:test` and `python3 scripts/test-voice-local.py`. CI provisions its own stack and sets the gateway public base to its reserved loopback API port. The fixture generates credentials, UUIDs and synthetic WAV bytes, verifies exact public audio duration and visibility, and removes only its own rows and users.
- Browser follow-up: use a dedicated disposable account on the intended origin. Check landing, sign-in, guest draft persistence, private entry create/edit/reopen, formatting, autosave and recovery, photo/cover selection, audio, explicit publish, signed-out playback, unpublish, Explore/profile, published manager, appearance, privacy and mobile navigation. Check console errors, request statuses and offline fallback without retaining payloads or credentials.

### Recommended next assignment

Confirm the intended public hostname and its owner-managed Netlify/DNS configuration, then run the disposable account browser lifecycle on that exact host and record the frontend and backend release evidence.

## Phase 1 · Reliability follow-up

- Assignment 01 PR #86 passed isolated database and voice checks and merged. The Netlify API reports no custom domain or aliases, and the requested apex responds with a parking redirect. Domain ownership remains unverified. If owned, add the domain in the existing Netlify project's Domain management panel, apply only the DNS records Netlify specifies at the authoritative DNS provider, then verify TLS, Auth redirect allowlists and gateway origins before changing canonical links. If unowned, confirm the Netlify hostname or another owned domain.
- Implemented bounded cloud-save retries and distinct auth/conflict/transient errors without changing the optimistic version check. Replaced unnecessary simulated keystrokes and autosave waiting in two timing-sensitive tests. Extended the isolated voice fixture with mixed approval. Dedicated hosted browser and user-specific playback remain unverified.
- Reviewed voice gateway origin and session checks, publication copy ownership and expiry controls, media validation and cache behavior, and repository migration/feature flag configuration. No production security settings or journals changed. This review does not certify the hosted database or an exhaustive security audit.
- Rollback: revert the reliability PR through a new PR. No migration accompanies it.
