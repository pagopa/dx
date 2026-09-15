# Trivy remediation report

The `modules-azure-postgres-server:trivy` scan reports six findings: three on the primary PostgreSQL Flexible Server and the same three on the optional read replica.

| Finding | Scope | Action |
| --- | --- | --- |
| `AVD-AZU-0019` — Ensure server parameter ’log_connections’ is set to ‘ON’ for PostgreSQL Database Server | Primary and optional replica | Suppress at each server resource. Connection logging can generate substantial log ingestion and storage costs for external IC consumers. |
| `AVD-AZU-0021` — Ensure server parameter `connection_throttling` is set to `ON` for PostgreSQL Database Server | Primary and optional replica | Remediate with `azurerm_postgresql_flexible_server_configuration`, setting the parameter to `on`; retain a resource-scoped suppression because the Trivy check does not correlate this flexible-server configuration resource. |
| `AVD-AZU-0024` — Ensure server parameter ’log_checkpoints’ is set to ‘ON’ for PostgreSQL Database Server | Primary and optional replica | Remediate with `azurerm_postgresql_flexible_server_configuration`, setting the parameter to `on`. |

`AVD-AZU-0019` and the scanner-only `AVD-AZU-0021` suppressions are limited to the affected resource blocks, not global. Each suppression contains the finding's long title as required by the Trivy policy. The underlying `connection_throttling` and `log_checkpoints` parameters remain configured for both server types. Replica configuration resources are created only when the module creates a replica.

The configuration resources use Azure's flexible-server parameter API. Parameters that Azure classifies as static can restart a server when changed; this must be reviewed in the plan before applying the module to an existing deployment.
