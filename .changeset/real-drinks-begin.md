---
"azure_container_app": major
---

The number of replicas are no longer tied to the chosen tier, and can be set independently.

New features:

- Add support to scaling rules
- Set the termination grace period to 30 seconds

Documentation:

- Add documentation for scaling rules

### Upgrade Notes

- Set the number of desired range of replicas by using the variable `autoscaler.replicas`. The field is mandatory
- The minimum version of `azurerm` provider is set to `4.16.0`
