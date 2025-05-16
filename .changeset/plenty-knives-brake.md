---
"azure_cosmos_account": minor
---

### Added

- Cosmos DB SQL role assignment capability. This change allows assigning the "Cosmos DB Built-in Data Reader" and "Cosmos DB Built-in Data Contributor" roles to multiple principals on all cosmos database scope.

### Notes

This change is part of a strategy to reduce the impact of disabling local authentication in the future. The role assignment capability is introduced as optional now, allowing teams to start assigning appropriate roles to their principals. In a future update, these role assignments will become mandatory, as access to Cosmos DB resources will require proper roles once local authentication is disabled.
