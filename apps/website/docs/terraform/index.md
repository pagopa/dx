---
sidebar_position: 7
---

# Working with Terraform

This section offers comprehensive guidance on infrastructure-related topics,
common problem resolutions, patterns, and best practices for building scalable
applications on Azure.

## Infrastructure for Application Developers

As a software engineer, you'll need to deploy infrastructure for your
applications. Start here:

1. **[Learn about our Terraform modules](./using-terraform-registry-modules.md)** -
   Use our production-ready modules
2. **[Deploy Azure resources](../azure/index.md)** - Deploy secure, scalable
   infrastructure for your applications
3. **[Automate deployments](./infra-apply.md)** - Set up CI/CD for
   infrastructure

## Available Tools

### 🏗️ Terraform Modules

Production-ready modules available on the
[Terraform Registry](https://registry.terraform.io/namespaces/pagopa-dx):

- **[Azure Core Infrastructure](https://registry.terraform.io/modules/pagopa-dx/azure-core-infra)** -
  Foundational networking, security, and monitoring
- **[Container App Environment](https://registry.terraform.io/modules/pagopa-dx/azure-container-app-environment)** -
  Scalable containerized applications
- **[Role Assignments](https://registry.terraform.io/modules/pagopa-dx/azure-role-assignments)** -
  Secure identity and access management

[**Browse all modules →**](https://registry.terraform.io/namespaces/pagopa-dx)

### 🔧 DX Provider

Custom Terraform provider for Azure resources:

- Simplified configuration for common patterns
- Built-in security best practices
- Integration with DX conventions

[**Learn about the DX provider →**](../contributing/contributing-to-dx-provider.md)

### 📋 Best Practices

- **[Pre-commit hooks](./pre-commit-terraform.md)** - Validate and format
  Terraform code
- **[Azure naming conventions](../azure/azure-naming-convention.md)** -
  Consistent resource naming
- **[Folder structure](./infra-folder-structure.md)** - Organize Infrastructure
  as Code

## Azure Resources Guide

### Most Common Use Cases

- **[Setting up static web apps](../azure/setting-up-azure-static-web-app.md)** -
  Deploy static sites with CI/CD
- **[IAM and security](../azure/azure-iam.md)** - Manage permissions and access
  control
- **[API Management](../azure/apim/index.md)** - Configure and secure APIs
- **[Monitoring and tracing](../azure/azure-tracing.md)** - Observability and
  debugging

[**View all Azure guides →**](../azure/index.md)

## Contributing

Help improve DX infrastructure tools:

- **[Contributing to Terraform modules](../contributing/contributing-to-dx-terraform-modules.md)** -
  Add new modules or improve existing ones
- **[Module documentation](../contributing/documenting-dx-terraform-modules.md)** -
  Keep docs up to date
- **[Testing and validation](./pre-commit-terraform.md)** - Ensure quality and
  consistency

## Getting Support

- **Issues with modules?** Open an issue on the
  [DX repository](https://github.com/pagopa/dx/issues)
- **Feature requests** We welcome suggestions for new modules

:::tip **Infrastructure as Code Best Practices**

Follow our [Infrastructure as Code guidelines](./infra-folder-structure.md) to
ensure consistency across projects and teams.

:::
