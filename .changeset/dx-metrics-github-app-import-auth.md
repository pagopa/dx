---
"dx-metrics": minor
---

Update `dx-metrics` import authentication to prefer GitHub App installation
credentials while keeping `GITHUB_TOKEN` as a fallback.

Migration notes:

- `apps/dx-metrics/scripts/import.ts` now prefers `GITHUB_APP_ID`,
  `GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY`
- if GitHub App credentials are not configured, `GITHUB_TOKEN` is still
  accepted as a fallback
- `GITHUB_APP_PRIVATE_KEY` may be provided either as PEM multiline content or
  with escaped `\n` line breaks
