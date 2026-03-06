---
"azure_cdn": patch
---

This fix avoids cases where a pre-validated custom domain results in an empty `validation_token`, which would cause the plan or apply to fail, by adding a check that inserts a dummy value instead.
