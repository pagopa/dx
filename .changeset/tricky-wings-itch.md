---
"@pagopa/dx-cli": patch
---

The encode of the `github-runner-app-key` in `base64` when stored in the common kv has been reverted. The secret is now stored as plain value and stripped for trailing newlines.
