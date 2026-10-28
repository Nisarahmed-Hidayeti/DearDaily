# DearDaily working development MVP — October 28, 2026

## Result

Private journaling and deliberate public publishing work locally against deardaily-dev. Public registration remains disabled. User A is signed in at /app/write with a clean editor ready for a real entry. No website deployment was performed. This is a controlled development MVP, not a production-readiness certification.

## Identity verification

The original account verifier rejected duplicate authenticated IDs and independently validated both users with Supabase auth.getUser(). Its separate own-row inserts and cross-user checks could not all pass for one ID; editable post-logout email fields were not the identity evidence.

A second real-session verification displayed two different masked ID endings and compared the **full authenticated IDs** both during login and at the start of hosted journal tests. Both server-validated IDs differed. No passwords, tokens or full user IDs are recorded here. The 44 earlier account checks, fixture cleanup, both logouts and signed-out access denial passed.

## Approved hosted migration

Preflight confirmed deardaily-dev, exactly the original profiles/user_settings public tables, their eight policies and enabled/forced RLS, two distinct confirmed accounts, and no conflicting journal/story table or version function. No existing data was reset, overwritten or deleted.

Applied only 20261028000100_private_entries_public_snapshots.sql in BEGIN/COMMIT after verifying the exact editor payload against the reviewed file.

SHA-256: 22a46f2d5fa8f72b43e1bbe16114a746bca8830b49e82c7f16e28e4467bea8eb

Both new tables have RLS enabled and forced, with four policies each. journal_entries is owner-only. public_stories permits anonymous reads of id/title/body/published_at only. Owner IDs and private journal metadata cannot be read through that interface. Private drafts are not public records; draft edits do not update an existing published snapshot.

The two migrations were applied through Dashboard SQL Editor. CLI migration history remains absent and unchanged. Do not run db push/replay the CREATE migrations before separately approved history reconciliation.

## Tests actually executed

- **44 real hosted account checks** passed earlier, with fixture cleanup and both logouts.
- **54 real hosted journal checks passed**, using two ordinary authenticated user sessions and an anonymous client. Verified own CRUD; A/B private read/update/delete denial; owner/version spoofing rejection; stale-save rejection; private drafts absent from public queries; public field allowlist; hidden owner/wildcard/private joins denied; unauthorized publication/update/unpublish rejection; private edits leaving public copies unchanged; unpublish; delete cascade; fixture cleanup. User B was logged out. User A's existing session was transferred to the normal application SDK for the writing walkthrough; passwords were not retained.
- **Actual browser lifecycle passed:** Write → Save → Publish confirmation → Explore → anonymous story view → Unpublish confirmation → anonymous story unavailable → private source still saved → autosave edit → reload preserved words → delete confirmation → empty dashboard.
- A second synthetic entry verified the first autosave gives a canonical entry URL and survives immediate refresh. It was then removed.
- Dashboard showed one saved entry, 16 words and a one-day streak for the first fixture; after deletion it returned to zero. All synthetic journal/public-story records were cleaned up.
- Four themes applied through the authenticated cloud settings: Forest Green, Paper White, Obsidian Black, then restored Midnight Purple. A rapid click during a previous theme transition had to be retried after it settled; each final synchronized state was verified.
- TypeScript, ESLint, **73 frontend tests**, and production build passed after the final code changes. The development verifier routes/fixture text were absent from production output.
- **124 pgTAP tests passed locally** earlier against the same unchanged migrations. A final local rerun was blocked because Docker was inactive and starting it required interactive sudo; the GitHub verification workflow provides a separate Docker-capable rerun. The hosted 54-check suite and browser tests above executed successfully after migration application.
- Browser layout had no horizontal overflow at its actual 715px viewport. Requested override widths did not take effect in this IAB session; separate 360/768/1440px responsive certification is not claimed.
- Final anonymous REST checks: private entries 401/42501; public safe fields 200 with no remaining test stories; hidden owner field 401/42501. Hosted settings still report disabled signup and required email confirmation.

## Advisor findings and remaining limits

Two findings are present after the migration: **Leaked Password Protection Disabled** (Auth warning) and **Unindexed foreign keys** on public.public_stories (performance advisory). Neither was silently changed. Use unique strong passwords for the closed-beta accounts; review compromised-password protection before expanding access. Review a supporting FK index as a separate migration. These findings must not be described as a zero-warning/fully production-ready state.

Google OAuth, custom SMTP and email recovery are deferred by explicit owner instruction. Manually confirming users does not prove email delivery/verification. Migration-history reconciliation, backups/restore, broader device testing and production operations remain future work. Public text can be copied by readers; unpublish cannot retract downloaded copies. Open story pages recheck on focus/every 15 seconds; already fetched copies may persist until refreshed.

No comments, followers, AI, payments, analytics, public signup, or website deployment were added. The original design, demo routes, reduced-motion support and four themes remain available. Local runtime uses VITE_ENABLE_JOURNALS=true in the ignored .env.local; .env.example keeps a safe false default for other environments. The local server runs as the transient user service deardaily-dev.service so chat interruptions do not stop it. Stop it when finished with: systemctl --user stop deardaily-dev.

## First real entry

Open http://localhost:5173/app/write in the existing signed-in browser tab. Write a title and text. Wait for Saved to your private account (or click Save entry). Publish story requires saving first and confirming the complete public text. Explore shows published snapshots; Unpublish removes the public copy while keeping the private source. Export private copy downloads Markdown without placing journal text in localStorage.

---

# Real-account essential gate passed — October 28, 2026

The local verifier reported **PASS: 44 hosted checks**, **Cleanup: PASS**, and **Both logouts and signed-out denial: PASS**. These used two distinct manually confirmed users, genuine email/password sessions and only ordinary publishable-key clients. No passwords, tokens, emails or user IDs are included in this report.

The checks verified owner profile/settings CRUD, cross-account read/update/delete denial, spoofed inserts and owner-change rejection, anonymous denial, unchanged owner rows following attacks, own updates, synthetic-fixture cleanup, logout and signed-out permission denial. Afterward both verifier clients were signed out. Email delivery/verification, recovery and Google were deliberately deferred by the owner; manually confirmed users do not prove delivered email confirmation.

The journal/public-snapshot migration remains locally tested only, unchanged at SHA-256 22a46f2d5fa8f72b43e1bbe16114a746bca8830b49e82c7f16e28e4467bea8eb. Hosted application still requires explicit approval. No hosted journal/public-story writes or deployment have occurred. Cloud mode stays disabled until hosted schema/public-private tests pass. Earlier pending-account-login statements below are historical.

---

# DearDaily smallest usable milestone — October 28, 2026

## Current scope and safety gate

The owner reprioritized a small private-journal/public-story MVP. Custom SMTP, Google OAuth and email recovery are deferred. Public registration stays disabled. Existing four themes and sample pages are retained.

Implemented and tested locally, not enabled against hosted storage yet:

- Owner-only private entries: create/read/edit/delete, saved drafts, 1.2-second debounced autosave, confirmed save/error states, source revision checking, private Markdown export.
- Private library/dashboard: account-only entries, text/tag search, mood/date filters, actual counts/words, saved-date streak and activity heatmap. No fictional statistics for an authenticated cloud-enabled account.
- Explicit publication with full-text confirmation, separate public snapshots, Explore/details, explicit update of a public copy, unpublish and cascade removal on entry deletion. No automatic publication from editing a private entry.
- Development-only real-login account security verifier. Passwords are entered directly by the owner, cleared after login and never persisted/logged. Ordinary non-persisted user sessions are used, never admin credentials. The route is omitted from production builds.
- An immediately usable fallback: private Markdown export and reviewed public-only standalone HTML export. No cloud feature is faked.

The feature switch `VITE_ENABLE_JOURNALS` defaults false. Enable it only after real account isolation passes, the hosted migration is approved/applied, and journal/public API isolation passes. The app can be used now for writing/exporting at /app/write; it clearly states cloud saving is disabled.

## Database design and reviewed migration

`supabase/migrations/20261028000100_private_entries_public_snapshots.sql`

SHA-256: 22a46f2d5fa8f72b43e1bbe16114a746bca8830b49e82c7f16e28e4467bea8eb

journal_entries stores UUID id/owner, title, body, mood, tags, category, calendar entry date, draft/saved status, server revision and timestamps. Every CRUD policy checks the authenticated owner. Anonymous users have no table privileges. Column grants prevent owner/ID/revision/timestamp writes. A security-invoker trigger advances the revision; every application update matches the last confirmed version. Zero-row updates/deletes are failures, not success. After errors, automatic retries stop until explicit recovery. A network response may be uncertain: export, then reload the server version to reconcile before overwriting.

public_stories stores a deliberately chosen title/body snapshot plus public id/date and a hidden owner ID. Only id,title,body,published_at are selectable by API roles. Wildcard or user_id reads are denied. Anonymous users cannot insert/update/delete. Authenticated mutation policies require ownership. A composite foreign key binds the snapshot to the same owner's entry; deleting the entry cascades to the snapshot. No privileged publishing function or owner-bypassing view is used. Direct API publication by the owner is possible; the confirmation UI expresses intent, while grants/RLS enforce access.

Public source entries never gain a public-read policy. Updating a draft leaves an already published snapshot untouched; publishing updates requires another explicit confirmation. Unpublish removes the snapshot, but cannot retract text already downloaded by readers. Open public-detail pages recheck on focus and every 15 seconds; already-rendered/cached copies may remain readable until refreshed. This is ordinary public web publishing, not revocable encryption.

The hosted account migration was applied in the dashboard earlier and CLI history is absent. No automatic `db push` or reset is safe. Reconciliation remains a separate approved bookkeeping operation; the current journal migration is only locally applied. Do not replay the account migration. Any approved dashboard application must use the exact reviewed SQL in one transaction after conflict checks.

## Actual verification so far

- Local migrations applied without resetting existing local data.
- **124 pgTAP checks passed across account/journal suites.** Anonymous A/B own/cross CRUD, spoofed ownership, ownership/version/timestamp grants, invalid values, snapshot privacy, intended public fields, unauthorized publication/unpublish attempts, private edits after publishing, unpublish and cascade behavior verified.
- **73 frontend tests passed.** Added debounce/in-flight editing/error/conflict checks, save/publish/unpublish confirmation flow, safe rendering, actual-date statistics and escaped public export tests. SDK tests use mocks and are not hosted integration evidence.
- TypeScript, ESLint, production build and diff whitespace checks passed. Both disabled/default and enabled-cloud builds were compiled successfully during implementation.
- Browser: synthetic draft writing, public export review and actual public HTML download passed. No real personal text was used.
- Production output does not include the development security-verifier page/fixture text.

## Hosted checks still required

The two test accounts were manually created/confirmed by the owner. Public signup is disabled. Password entry in the opened local verifier is pending; no actual A/B login or hosted write results are claimed yet. The verifier requires explicit fixture approval, refuses to overwrite existing account records, checks A/B/anonymous reads and mutations, verifies unchanged rows, deletes only its own synthetic fixtures, and tests signout/signed-out denial.

After account tests pass and approval is received: apply the reviewed journal migration only to deardaily-dev, verify catalog/grants/Advisor, test journals and public API with genuine A/B sessions, then test the real editor save → publish → anonymous view → unpublish lifecycle. Do not declare cloud storage or publishing secure/working until these pass. No hosted journal migration, public story or deployment has been performed.

## Safe local-file fallback and manual public route

1. Write at /app/write. Click **Export private copy** to keep a Markdown file on your computer. No private content goes to browser storage or cloud in fallback mode. Leaving the temporary editor still discards in-memory text, so download first.
2. To share a selected story, click **Review public export**, read the exact title/text, then **Confirm public export**. The standalone HTML omits owner/account details, mood, tags, category and journal date; text is HTML-escaped and scripts/network requests are blocked by its CSP. Nothing is published automatically.
3. Review the exported file locally before sharing. Keep the private Markdown separate. Never put private exports under public/ or in Git.
4. For a temporary static public URL, after explicit publication approval, copy only the reviewed public HTML into `public/stories/first-story.html` on a review branch. Review its complete diff and confirm no private metadata. The future URL would be /stories/first-story.html. Adding an Explore link is an explicit reviewed public change, not automatic discovery.
5. Deploy only after separate deployment approval; no current live URL is claimed. To unpublish the static fallback, remove the public file/link in a reviewed change and deploy with approval. Previously downloaded copies cannot be revoked.

## Limits

Private text is kept only in live component memory and Supabase; there is no private localStorage cache or offline queue. Reload/close warnings cover unsaved edits; browser crashes may lose changes not yet confirmed. Autosave uses optimistic revision checks, not collaborative merging. Account switches remount account/theme/editor state and stale responses are ignored. Explore lists the latest 100 snapshots; journal reads paginate privately. Full responsive testing of authenticated hosted states is still pending; existing theme/accessibility tests pass. Backups, export/deletion lifecycle, abuse moderation and production operations need separate launch review. No comments, followers, AI, payments, analytics, or unrelated infrastructure is included.
