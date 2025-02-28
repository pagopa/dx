# Azure CDN Module Examples

This directory contains examples of how to use the Azure CDN module.

## Basic Example

The [basic example](./basic) demonstrates a simple implementation of the Azure CDN module with a single origin and a redirect rule to force HTTPS.

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
- A delivery rule that redirects HTTP traffic to HTTPS