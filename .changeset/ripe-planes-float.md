---
"azure_container_app": major
---

The user-assigned managed identity is now used to authenticate the Container App with other Azure services.

New features:

- Add support to private Azure Container Registry
- Add support to user-assigned managed identity

Bug fixes:

- The variable `readiness_probe.initial_delay` was unintentionally unused

Documentation:

- Add description for outputs
