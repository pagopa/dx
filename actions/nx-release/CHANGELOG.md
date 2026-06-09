## 0.3.2 (2026-06-09)

### 🩹 Fixes

- Upgrade dependencies ([#1818](https://github.com/pagopa/dx/pull/1818))
- Upgrade dependencies ([#1818](https://github.com/pagopa/dx/pull/1818))

### ❤️ Thank You

- Copilot @Copilot
- Danilo Spinelli @gunzip

## 0.3.1 (2026-05-25)

### 🩹 Fixes

- Ensure that each new tag is pushed individually to allow GitHub workflows to trigger for each tag, as GitHub does not create tag push events when more than three tags are pushed in a single operation. ([#1790](https://github.com/pagopa/dx/pull/1790))

### ❤️ Thank You

- Christian Calabrese

## 0.3.0 (2026-05-25)

### 🚀 Features

- Use GitHub App for GitHub authentication instead of a PAT ([#1781](https://github.com/pagopa/dx/pull/1781))

### ❤️ Thank You

- Christian Calabrese
- Copilot Autofix powered by AI @github-advanced-security[bot]

## 0.2.0 (2026-05-08)

### 🚀 Features

- Update the authentication method to use a GitHub App instead of a PAT token ([#1721](https://github.com/pagopa/dx/pull/1721), [#1720](https://github.com/pagopa/dx/issues/1720))

### ❤️ Thank You

- Andrea Grillo
- Mario Mupo @mamu0

## 0.1.1 (2026-05-05)

### 🩹 Fixes

- Upgrade some dependencies ([#1690](https://github.com/pagopa/dx/pull/1690))

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.0.4

### ❤️ Thank You

- Marco Comi @kin0992

## 0.1.0 (2026-04-29)

### 🚀 Features

- Add managed PR warnings for missing version plans ([#1651](https://github.com/pagopa/dx/pull/1651))

  The validation flow can now run `nx release plan:check` on regular pull
  requests and post or remove a managed warning comment based on the result.

### ❤️ Thank You

- Mario Mupo @mamu0

## 0.0.3 (2026-04-17)

### 🩹 Fixes

- Suppress noisy 404 logs from Octokit when release tags are missing. ([#1632](https://github.com/pagopa/dx/pull/1632))

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.0.3

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.0.2

### Patch Changes

- 44b3eab: Switch release mode detection from GitHub event type to `.nx/version-plans` directory state on push to main; remove `::notice::` annotations; use `npx nx` for all Nx commands; make PR body generic (no npm reference)

## 0.0.1

### Patch Changes

- bf3fc4e: Adds a new GitHub Action for Nx releases.
  It automatically creates or updates a 'Version Packages' Pull Request whenever new version plan files are added to .nx/version-plans.
  Upon merging this PR, the action handles Git tagging, creates GitHub Releases, and publishes to npm.
