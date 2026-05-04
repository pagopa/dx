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
