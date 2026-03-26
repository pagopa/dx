# dx-metrics

## 0.4.1

### Patch Changes

- 66b392d: Update to support the newest version of @pagopa/eslint-config (eslint10, new rules)

## 0.4.0

### Minor Changes

- ec25dab: Update `dx-metrics` import authentication to prefer GitHub App installation
  credentials while keeping `GITHUB_TOKEN` as a fallback.

  Migration notes:
  - `apps/dx-metrics/scripts/import.ts` now prefers `GITHUB_APP_ID`,
    `GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY`
  - if GitHub App credentials are not configured, `GITHUB_TOKEN` is still
    accepted as a fallback
  - `GITHUB_APP_PRIVATE_KEY` may be provided either as PEM multiline content or
    with escaped `\n` line breaks

## 0.3.0

### Minor Changes

- 94d5d8c: The /api/health route has been added to check for app's liveness and db connectivity

## 0.2.0

### Minor Changes

- b59bd13: Remove GitHub authentication from `dx-metrics` and make the dashboards
  anonymously accessible.

  The Better Auth runtime and the legacy `user`, `session`, `account`, and
  `verification` tables are no longer part of the app. If you are upgrading an
  existing database, drop those tables before applying the updated Drizzle schema.

## 0.1.1

### Patch Changes

- b2da45c: Implement Dockerfile

## 0.1.0

### Minor Changes

- 93860df: Add Engineering Metric and DX Dashboard
