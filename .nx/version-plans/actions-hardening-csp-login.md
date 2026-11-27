---
csp-login: patch
---

Emit a warning when `csp-login` exports the GitHub App token to later steps via `GITHUB_ENV` (default `export-github-token: "true"`). Set `export-github-token: "false"` and use the `github-token` output instead. Behavior is otherwise unchanged.
