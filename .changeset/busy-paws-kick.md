---
"azure_function_app": patch
---

Add `endpoints.queue` as output of the storage account block

This new `endpoints` block can be extended in the future to include other
endpoints if needed.

Use the `endpoints.queue` output to configure RBAC on queues.
