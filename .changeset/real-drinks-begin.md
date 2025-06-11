---
"azure_container_app": major
---

Set the azurerm provider at least to version `4.16.0` to ensure compatibility with new scaling features.

New features:

- Add support to scaling rules (both built-in and custom)
- Add support to override default number of replicas
- Set the termination grace period to 30 seconds

Documentation:

- Add documentation for scaling rules

### Upgrade Notes

- Set the azurerm provider at least to version `4.16.0` as follows:

```hcl
required_providers {
  azurerm = {
    source  = "hashicorp/azurerm"
    version = "~> 4.16.0"
  }
}
```
