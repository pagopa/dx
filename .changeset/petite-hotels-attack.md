---
"@pagopa/dx-cli": patch
---

Remove redundant functions

Remove `existsPreCommitConfig`, `existsTurboConfig` and replace them with the `fileExists` function.

Pass the `Config` object to `checkTurboConfig`, `checkPreCommitConfig` and `checkMonorepoScripts` where the repository root path is available.

Remove the call to `findRepositoryRoot` in the `runDoctor` function, because the repository root path is passed in the `Config` object.
