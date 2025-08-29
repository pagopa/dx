---
"azure_postgres_server": major
---

Replaced the `tier` variable with a new `use_case` variable for tiering configuration. The previous values (`s`, `m`, `l`) have been replaced by a new option: `default` (formerly `m`). This change simplifies and clarifies the selection of Postgres Server tiers. In addition, replica creation is setted as default to `true` when the `use_case` is set to `default` (with a new variable `create_replica` is possible to change this), and with variable `replica_location` is possible to choose a different location for the replica.
