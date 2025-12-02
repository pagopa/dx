---
"@pagopa/dx-cli": patch
---

Refactored CLI to work outside repository context for commands that don't require it.

- The CLI no longer fails to start when run outside a Git repository
- The `doctor` command now explicitly checks for repository context and returns a clear error message if not in a repository
