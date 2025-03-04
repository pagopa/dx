---
"azure_role_assignments": major
---

Role assignments can now be created contextually with identities and target resources

**Migration guide**:
Remove all `name` and `resource_group_name` parameters from the variables and use the id gotten from a resource, module or data source as follows:
```
...
module "roles" {
  source       = "../../"
  principal_id = azurerm_user_assigned_identity.id.principal_id

  storage_table = [
    {
      storage_account_name = "test"
      resource_group_name  = "test-rg"
      table_name           = "test-table"
      role                 = "reader"
    }
  ]
...
}
```

becomes

```
...
module "roles" {
  source       = "../../"
  principal_id = azurerm_user_assigned_identity.id.principal_id

  storage_table = [
    {
      storage_account_id = module.storage_account.id
      table_name         = "test-table"
      role               = "reader"
    }
  ]
...
}
```