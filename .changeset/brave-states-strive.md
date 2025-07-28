---
"azure_postgres_server": patch
---

Update PEP creation logic, if delegated subnet is defined pep will be not created. Now you must specify `subnet_pep_id` or `delegated_subnet_id`, not both. The private endpoint output is now optional and will return null if not created. This change is backward compatible.

> [!WARNING]
> The old output structure is going to be removed in the next major release, so users should update their configurations accordingly to avoid issues in future upgrades
