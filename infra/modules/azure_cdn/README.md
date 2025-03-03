# Azure CDN (Front Door) Terraform Module

This module creates an Azure CDN Front Door profile with endpoints, origins, and routing rules.

## Features

- Azure Front Door CDN profile with Standard Microsoft SKU
- Origin configuration with health probes
- Custom routing rules and URL rewriting/redirects
- Consistent naming convention based on environment parameters

## Usage

```hcl
module "azure_cdn" {
  source = "path/to/module"
  
  resource_group_name = "your-resource-group"
  
  environment = {
    prefix    = "ex"
    env_short = "p"
    name      = "prod"
  }
  
  origins = {
    primary = {
      host_name = "your-app.azurewebsites.net"
    }
  }
  
  delivery_rules = {
    redirect-to-https = {
      request_scheme_condition = {
        match_values = ["HTTP"]
      }
      actions = {
        url_redirect_action = {
          redirect_type = "Found"
          protocol      = "Https"
        }
      }
    }
  }
  
  tags = {
    environment = "production"
    terraform   = "true"
  }
}
```

## Examples

- [Basic example](./examples/basic) - Simple CDN configuration with a single origin

## Testing

This module includes test files in the `tests` directory. You can run these tests using the Terraform test framework:

```
cd path/to/module
terraform test
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0.0 |
| azurerm | >= 3.0.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| resource_group_name | The name of the resource group | `string` | n/a | yes |
| environment | Environment configuration | `object` | n/a | yes |
| origins | Map of origins to be configured | `map(object)` | n/a | yes |
| delivery_rules | Map of delivery rule configurations | `map(object)` | `{}` | no |
| custom_domains | Map of custom domain configurations | `map(object)` | `{}` | no |
| tags | Map of tags | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| id | The ID of the CDN Front Door profile |
| endpoint_id | The ID of the CDN Front Door endpoint |
| cdn_endpoint_url | The URL of the CDN Front Door endpoint |