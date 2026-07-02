## 0.5.11 (2026-07-02)

### 🩹 Fixes

- Upgrade JavaScript dependencies (minor and patch updates) ([#1917](https://github.com/pagopa/dx/pull/1917))

### 🧱 Updated Dependencies

- Updated @pagopa/dx-metrics-core to 0.1.4

### ❤️ Thank You

- Copilot @Copilot
- Danilo Spinelli @gunzip

## 0.5.10 (2026-06-25)

### 🧱 Updated Dependencies

- Updated @pagopa/dx-metrics-core to 0.1.3

## 0.5.9 (2026-06-18)

### 🩹 Fixes

- Stabilize the DX Metrics Docker build by pinning the repository package manager and avoiding Nx workspace resolution inside the image build. ([#1841](https://github.com/pagopa/dx/pull/1841))
- Keep the DX Metrics Docker builds on each package's existing build script so the image build does not re-enter pnpm workspace resolution inside a reduced Docker workspace. ([#1852](https://github.com/pagopa/dx/pull/1852))

### ❤️ Thank You

- Copilot @Copilot
- Danilo Spinelli @gunzip

## 0.5.8 (2026-06-09)

### 🩹 Fixes

- Upgrade dependencies ([#1818](https://github.com/pagopa/dx/pull/1818))
- Upgrade dependencies ([#1818](https://github.com/pagopa/dx/pull/1818))

### 🧱 Updated Dependencies

- Updated @pagopa/dx-metrics-core to 0.1.2

### ❤️ Thank You

- Copilot @Copilot
- Danilo Spinelli @gunzip

## 0.5.7 (2026-05-19)

### 🩹 Fixes

- Split the DX Metrics portal from the importer ([#1750](https://github.com/pagopa/dx/pull/1750))

### 🧱 Updated Dependencies

- Updated @pagopa/dx-metrics-core to 0.1.1

### ❤️ Thank You

- Copilot @Copilot
- Copilot Autofix powered by AI @Copilot
- Danilo Spinelli @gunzip

## 0.5.6 (2026-05-13)

### 🩹 Fixes

- Add GitHub App support to run Terrawiz import without a separate GITHUB_TOKEN ([#1732](https://github.com/pagopa/dx/pull/1732))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.5.5 (2026-05-12)

### 🩹 Fixes

- Add missing repositories ([#1734](https://github.com/pagopa/dx/pull/1734))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.5.4 (2026-05-11)

### 🩹 Fixes

- Address typecheck errors across various files by updating imports and enhancing type definitions. Ensure proper handling of SQL execution and checkpoint management with improved type safety. ([#1729](https://github.com/pagopa/dx/pull/1729))

### ❤️ Thank You

- Christian Calabrese
- Danilo Spinelli

## 0.5.3 (2026-05-08)

### 🩹 Fixes

- Fix dx-metrics checkpoints to match exact since dates and expire after 23 hours. ([#1727](https://github.com/pagopa/dx/pull/1727))

### ❤️ Thank You

- Copilot @Copilot
- Danilo Spinelli @gunzip

## 0.5.2 (2026-05-05)

### 🩹 Fixes

- Upgrade some dependencies ([#1690](https://github.com/pagopa/dx/pull/1690))

### ❤️ Thank You

- Marco Comi @kin0992

## 0.5.1 (2026-04-17)

### 🩹 Fixes

- Upgrade dependencies ([#1639](https://github.com/pagopa/dx/pull/1639))

### ❤️ Thank You

- Marco Comi @kin0992

## 0.5.0

### Minor Changes

- a46bb9b: Add container app job to import metrics on a schedule.

### Patch Changes

- f74034d: Reference React version from dedicated catalog

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
