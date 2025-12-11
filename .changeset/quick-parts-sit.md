---
"github_environment_bootstrap": patch
---

Remove `advanced_security` block since the feature is enabled by default on public repos.

The module do not provide the creation of private repos, so this change will not affect existing users.
This will fix an issue when using the module:

```text
│ Error: PATCH https://api.github.com/repos/pagopa-dx/test-cli: 422 Advanced security is always available for public repos. []
```
