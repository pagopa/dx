---
"@pagopa/nx-terraform-plugin": patch
---

Fix `nx-release-publish` executor failing with "nothing to commit" when a module's subrepo main branch already matches the current content (e.g. concurrent legacy subtree sync), and fix a broken `git commit -m` argument quoting bug that split the release message into two arguments.
