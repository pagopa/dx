---
"azure_cosmos_account": major
---

Disabled local authentication in the Azure Cosmos DB account module by setting `local_authentication_disabled = true`

## Breaking Changes

This is a breaking change that affects how authentication works with Cosmos DB:

- Users must now configure the new `authorized_teams` variable with principal IDs of teams that need reader or writer access
- Without this configuration, teams will no longer be able to manage databases through the Azure portal
- Connected functions also require appropriate role assignments to continue functioning correctly

See PR: #549
