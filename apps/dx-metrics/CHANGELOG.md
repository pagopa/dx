# dx-metrics

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
