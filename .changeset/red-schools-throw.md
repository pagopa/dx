---
"@pagopa/dx-cli": patch
---

The `init` command now checks if the specified GitHub repository already exists before proceeding. If the repository exists, the command will fail early with a clear error message, preventing accidental overwrites and ensuring that only new repositories can be created.
