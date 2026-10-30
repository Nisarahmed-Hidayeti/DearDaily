# Registration launch checklist — 2026-10-30

## Current evidence

- Existing branch preserved. Focused authentication/configuration suite: 32 tests passed.
- Earlier actual Google login and reload persistence passed for existing User A. New Google-user creation and OAuth-session ownership isolation remain unverified.
- Hosted read-only audit: sign-in/signup limit 30 requests per 5 minutes per IP; verification limit 30/5 minutes; refresh limit 150/5 minutes. These are configured values, not load-tested enforcement results.
- Hosted CAPTCHA OFF; leaked-password protection OFF. Both remain release concerns. No hosted settings changed by this audit.
- Hosted Site URL is localhost:5173. Exactly two redirects: /auth/callback and /auth/reset-password on localhost:5173. Live-site callbacks are not yet configured; require approval and retesting before deployment.
- Public signup remains closed; email confirmation on and anonymous Auth disabled at the last verified provider checkpoint.
- Docker is stopped; local Auth/email integration cannot run until the owner starts it. Existing pgTAP results do not substitute for new-account Auth tests.

## SMTP candidate: Brevo Free

Free allowance: 300 sends/day. Account activation/review and actual delivery must be verified. Brevo documents temporary rewriting of unauthenticated/free-address senders to its own brevosend.com domain; this is a possible no-domain beta route, not a delivery guarantee. Its normal SMTP setup recommends an authenticated owned domain. If this account requires one, stop and report the blocker rather than buying a domain or bypassing verification.

Owner setup, with credentials kept out of chat/repository:

1. Finish Brevo Free onboarding and any legitimate account-review steps. No paid plan or add-on.
2. Add and verify a transactional sender address controlled by the owner. Confirm account approval and whether temporary provider-domain sending is permitted. Review the actual From/Reply-To identity.
3. Generate a dedicated SMTP key. In Supabase's custom SMTP form, after approval, use host smtp-relay.brevo.com, port 587, Brevo's displayed SMTP login, SMTP key as password, approved verified sender address, sender name DearDaily. The SMTP key is different from an API key. Never use a frontend variable for it.
4. Keep a 60-second per-user resend interval; choose a conservative project-wide email rate consistent with actual provider approval/limits. Disable email click/open tracking for single-use auth links.
5. Test verification and recovery email delivery to controlled inboxes, including spam/bounce outcomes, expired/reused links and confirmed password login. Provider acceptance alone is not proof of receipt.

## Bot protection and new-user tests

Configure a real Turnstile widget for approved localhost and future live hostname. Public site key in local frontend environment; secret directly in Supabase after approval. Test rejection without/with invalid tokens, expiry, retry and legitimate login/recovery. Do not use test keys for hosted launch protection.

The owner's requirement to keep hosted signup OFF until all tests pass means genuine new registrations cannot be tested against that project yet. Use an isolated local Auth instance for signup/verification/recovery with captured mail; use a separately approved isolated hosted test project for actual external delivery and brand-new Google accounts. Do not temporarily expose deardaily-dev signup or create admin-confirmed users and claim registration passed.

For two distinct fresh accounts, verify register → email received → verify → login → private synthetic journal → save/reload → logout → login, then cross-owner read/write/delete/spoof denials and anonymous private-data denials. Repeat Google registration, validate account ID continuity and provider-linking behavior. Clean only exact fixture IDs with approval.

## Final activation

Only after evidence is recorded: request approval for hosted signup plus VITE_ALLOW_SIGNUP=true. Anonymous Auth remains disabled; email confirmation remains enabled. Merge and deployment require separate approval. Cosmetics, avatar uploads and admin expansion are deferred.

References:
- https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP
- https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-Domain-authentication
- https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans

### SMTP checkpoint

Owner verified the DearDaily Gmail sender and saved approved Brevo SMTP settings directly in Supabase. Initial recovery requests failed with HTTP 500 (email sending error); a mismatched SMTP login was identified without copying secrets. After the owner corrected it, a controlled User B recovery request returned HTTP 200. Inbox receipt, sender identity, spam placement and completed recovery remain pending; HTTP acceptance alone is not delivery proof. The diagnostic request is not the browser PKCE recovery test. Request a fresh browser-initiated link for the actual password-reset flow, with the owner entering/submitting the replacement password privately.
