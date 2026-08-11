# Config Files

Configuration in this folder is for business-editable values that should not be repeated across pages, actions, and tests. Import JSON through a small typed module in `lib/` rather than reading these files directly from many places.

When adding a new `config/*.json` file, document it here in the same change.

## `feature-requests.json`

Public feature-request page configuration for `/feature-requests`.

- `limits.nameMaxChars`, `limits.emailMaxChars`, `limits.titleMaxChars`, `limits.descriptionMaxChars`: form and server validation limits. These are mirrored in `supabase/migrations/20260815000000_feature_requests.sql` as database `CHECK` constraints.
- `rateLimit.maxSubmissionsPerHour`: maximum accepted submissions from the same hashed connection signal inside the rate-limit window.
- `rateLimit.windowMinutes`: rolling window used to count recent submissions.
- `notification.recipient`: internal inbox that receives feature-request notification emails.
- `submitterRoles`: select options for who is submitting the request. Values mirror the `feature_request_submitter_role` Postgres enum.
- `areas`: select options for which part of ServicePros the request concerns. Values mirror the `feature_request_area` Postgres enum.

Imported by `lib/feature-requests-config.ts`, then used by the form, server action, pure validation helpers, and tests.
