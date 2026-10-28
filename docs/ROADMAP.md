# DearDaily roadmap

1. **Frontend foundation (complete):** responsive landing, demonstration dashboard, temporary editor, sample public stories and detail routes, design tokens, accessibility foundations, tests and documentation.
2. **Identity and private storage:** integrate Supabase Auth, account lifecycle, protected storage and PostgreSQL policies. Test Row Level Security with multiple identities, anonymous access, and adversarial requests before storing private content. Never trust a frontend visibility flag as authorization.
3. **Persistent journaling:** durable drafts and entries, edit/delete, synchronization, meaningful save states, recovery and conflict handling. Add a deliberate migration path from temporary prototype behavior.
4. **Public storytelling:** explicit publish confirmation and unpublish flow, discovery, profiles, reporting and moderation. Publish only user-selected entries and audit privacy boundaries, including attachments and metadata.
5. **Habit tools and production:** calendar, truthful streaks and analytics, performance and accessibility refinement, operational monitoring, deployment and production readiness checks.

No backend integration, AI, payments, or live community interactions are part of Phase 1.

## Phase 2 foundation checkpoint

Local auth/UI integration, account migrations, RLS policies, theme synchronization code, and automated tests are implemented. The hosted development account schema, enabled/forced RLS, anonymous denial and Advisor Center were checked. Real two-account isolation, email/Google/recovery verification, migration-ledger reconciliation and the integration checklist in SUPABASE_SETUP.md remain required. Public registration remains closed. Do not start live journal persistence or call Phase 2 complete before these checks.

## Phase 3 started — security verification first

The feature branch starts from merged PR #2. Work begins with the mandatory Phase 2 security gate in [PHASE_3_SECURITY_GATE.md](PHASE_3_SECURITY_GATE.md): real testers/authentication, hosted cross-account API isolation, Google/email configuration and safe migration-history reconciliation. Local pgTAP was rerun successfully (71 tests). Approved localhost redirects are configured. Persistent journals and real dashboard statistics remain blocked pending the gate. No publishing or deployment is included.
