---
"dx-metrics": minor
---

Remove GitHub authentication from `dx-metrics` and make the dashboards
anonymously accessible.

The Better Auth runtime and the legacy `user`, `session`, `account`, and
`verification` tables are no longer part of the app. If you are upgrading an
existing database, drop those tables before applying the updated Drizzle schema.
