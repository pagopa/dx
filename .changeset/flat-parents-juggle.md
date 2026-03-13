---
"nx-release": patch
---

Adds a new GitHub Action for Nx releases. 
It automatically creates or updates a 'Version Packages' Pull Request whenever new version plan files are added to .nx/version-plans. 
Upon merging this PR, the action handles Git tagging, creates GitHub Releases, and publishes to npm.
