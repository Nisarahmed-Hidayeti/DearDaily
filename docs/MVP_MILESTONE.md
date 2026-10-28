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
