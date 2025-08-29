---
"azure_storage_account": patch
---

Ignore customer_managed_key value as per [documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) to avoid removing CMK already instantiated created via the azurerm_storage_account_customer_managed_key resource
