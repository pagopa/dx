---
"azure_cdn": patch
---

This Fix avoid cases where a pre-validated custom domain results in an empty `validation_token`, which would cause the plan or apply to fail, add a check that inserts a dummy value instead.
