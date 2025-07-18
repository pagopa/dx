---
"@pagopa/dx-cli": patch
---

Convert the functions of the RepositoryReader interface to async

This change was made to ensure all file system operations are handled asynchronously, improving performance and consistency across the codebase.
