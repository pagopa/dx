## 0.0.2

### Patch Changes

- 44b3eab: Switch release mode detection from GitHub event type to `.nx/version-plans` directory state on push to main; remove `::notice::` annotations; use `npx nx` for all Nx commands; make PR body generic (no npm reference)

## 0.0.1

### Patch Changes

- bf3fc4e: Adds a new GitHub Action for Nx releases.
  It automatically creates or updates a 'Version Packages' Pull Request whenever new version plan files are added to .nx/version-plans.
  Upon merging this PR, the action handles Git tagging, creates GitHub Releases, and publishes to npm.
