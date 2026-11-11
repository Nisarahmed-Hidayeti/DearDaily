# Minimal public settings and automatic shared rhythm

Remove the Published stories sidebar statistic and its setting. Keep interests/link controls under a small disclosure. Use a compact two-column identity form, quiet sharing section and collapsed preview. No existing profile/story data is deleted.

## Sharing behavior

There is no auto-refresh option. A shown streak/calendar is current, calculated on profile viewing and refreshed every minute while the page is visible. Hide stops sharing. The two settings are simply Writing streak and Writing calendar.

The previous UI explicitly promised snapshot-only disclosure. Existing snapshots are therefore preserved until their author confirms the new ongoing-sharing wording once (“Confirm updated sharing”). New sharing choices always use automatic updates. No extra automatic-update switch or permanent refresh buttons. Day-level consent remains independent from count-only consent. Existing users are never silently expanded into ongoing date sharing.

## Proposed hosted change

`20261110000300_automatic_shared_rhythm.sql` adds a private time-zone field and a read-only internal consent-version flag (false by default). An authenticated own-profile RPC sets both sharing choices atomically. A public read RPC returns only the approved count/calendar for a visible profile; it never exposes source journals, owner IDs, time zone, moods or entry counts. Calculation helper has no anonymous/authenticated execution grant. Time zones are validated against PostgreSQL's built-in list. Existing snapshots, RLS, Auth and Storage remain unchanged.

Preflight must confirm deardaily-dev, function/column absence and existing profile visibility RLS; stop on conflicts. No migration reapplication or history repair. Apply only after CI passes. Test source fixtures only; never repurpose real profiles/journals. Recovery disables VITE_ENABLE_LIVE_RHYTHM and retains data/functions. Existing table snapshots remain readable; authors can hide either sharing choice. Managed backup/restore rehearsal remains an operational gap.

Production activation requires reviewed approval plus hosted permission tests. This change does not itself opt any existing author into ongoing disclosure.

## Music visibility correction

Read-only inspection found all ten currently published snapshots have null music. No private attachment is copied automatically. The final Publish/Update confirmation now has a visible Include this music checkbox; its choice saves privately before final publication, retaining the existing source-approval trigger and snapshot independence. Explore cards show a small Listen link only when a validated music selection exists in the public snapshot. No real stories were modified.
