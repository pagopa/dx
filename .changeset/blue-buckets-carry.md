---
"azure_storage_account": major
---

**BREAKING CHANGE:** 

Public access to blobs within containers is now disabled by default in the Azure Storage Account module. If public blob access is explicitly required, this setting must be overridden with variable `force_public_network_access_enabled`.
