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

- **WAF Protection**: Web Application Firewall policy with Prevention mode enabled
- **Existing Profile**: Reusing an existing CDN FrontDoor profile to create additional endpoints
- **Multiple Storage Origins**: Different storage accounts as origins

### Usage

```bash
cd advanced
terraform init
terraform plan
terraform apply
```

This will create:

- A CDN profile with WAF protection enabled
- A secondary endpoint reusing the existing profile
- Storage accounts for origin content
- WAF firewall and security policies
