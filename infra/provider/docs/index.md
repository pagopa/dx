---
# generated by https://github.com/hashicorp/terraform-plugin-docs
page_title: "azure Provider"
subcategory: ""
description: |-
  The azure Terraform provider is for Developer Experience, simplifies the creation and management of Azure resources following standardized naming conventions.
---

# azure Provider

The dx provider is used to generate and manage naming of Azure resources.

## Example Usage

```terraform
provider "dx" {
  prefix      = "<project_prefix>" # e.g., "dx", "io"
  environment = "<environment>"    # d, u, or p (dev, uat, or prod)
  location    = "<location>"       # itn/italynorth or weu/westeurope
  domain      = "<domain>"         # e.g., "test"
}
```

<!-- schema generated by tfplugindocs -->
## Schema

### Optional

- `domain` (String) The team domain name
- `environment` (String) Environment where the resources will be deployed
- `location` (String) Location where the resources will be deployed (e.g., `itn`, `weu`, `italynorth`, `westeurope`)
- `prefix` (String) Prefix that define the repository domain
