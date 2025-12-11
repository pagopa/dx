---
"azure_storage_account": patch
---

Add `override_infrastructure_encryption` variable to prevent storage account recreation for audit use case

In version 2.1.0, the `infrastructure_encryption_enabled` setting was enabled by default for the audit use case. This caused a breaking change for existing storage accounts, as modifying this parameter forces resource recreation in Azure.

This patch introduces the `override_infrastructure_encryption` variable (default: `false`) to allow disabling infrastructure encryption when needed, preventing the forced recreation of existing storage accounts while maintaining backward compatibility.

**Note**: This variable is marked as deprecated and will be removed in the next major version. Infrastructure encryption should be managed through proper use case configuration.
