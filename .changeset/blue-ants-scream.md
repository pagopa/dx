---
"azure_core_infra": major
---

Replace azurermv3 support with azurermv4

## Migration guide

Update your Terraform configuration from azurerm v3 to azurerm v4, and make sure your Terraform version is above or equal to 1.9.

Remember that azurerm v4 requires you to set in your local CLI profile the following environment variable:

- `ARM_SUBSCRIPTION_ID`: with the id of the subscription you want to work with
