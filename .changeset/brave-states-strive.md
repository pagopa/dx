---
"azure_postgres_server": patch
---

Update PEP creation logic, if delegated subnet is defined pep will be not created. Now you must specify subnet_pep_id or delegated_subnet_id, not both. The private endpoint output is now optional and will return null if not created. This change is backward compatible, but the old output structure will be removed in the next major version.

PR title: Update PEP creation logic and outputs
PR description: This change updates the logic for creating the private endpoint in the Azure PostgreSQL server module. It introduces a new variable `delegated_subnet_id` to allow users to specify either `subnet_pep_id` or `delegated_subnet_id`, but not both. The private endpoint output is now optional and will return null if the private endpoint is not created. This change maintains backward compatibility, but the old output structure will be removed in the next major version.