# Azure CDN Module Examples

This directory contains examples of how to use the Azure CDN module.

## Basic Example

The [basic example](./basic) demonstrates a simple implementation of the Azure CDN module with a single origin and custom domains.

### Usage

```bash
cd basic
terraform init
terraform plan
terraform apply
```

This will create:

- A resource group
- An Azure Front Door CDN profile
- An endpoint with a single origin
- Custom domain configurations
- A delivery rule for URL redirects

## Advanced Example

The [advanced example](./advanced) demonstrates advanced features including:

- **WAF Protection**: Web Application Firewall policy (no managed rule sets on Standard SKU; users must configure custom rules)
- **Managed Identity**: Automatic role assignment for managed identity authentication to storage
- **Existing Profile**: Reusing an existing CDN FrontDoor profile
- **Multiple Origins**: Failover configuration with priority-based routing

### Usage

```bash
cd advanced
terraform init
terraform plan
terraform apply
```

This will create:

- Multiple CDN configurations demonstrating different features
- Storage accounts with private endpoints
- WAF policies and security policies
- Role assignments for managed identity access
