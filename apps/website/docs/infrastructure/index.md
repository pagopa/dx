---
sidebar_label: Infrastructure
sidebar_position: 4
---

# Infrastructure

This section offers comprehensive guidance on infrastructure-related topics, common problem resolutions, patterns, and best practices for building scalable applications on Azure.

## Contributing to Infrastructure

Want to contribute to DX infrastructure tools? Start here:

1. **[Learn about our Terraform modules](./using-terraform-registry-modules.md)** - Understand our production-ready modules
2. **[Contribute to modules](./contributing-to-dx-terraform-modules/index.md)** - Help improve shared infrastructure
3. **[Understand Azure patterns](./azure/index.md)** - Learn our Azure resource patterns
4. **[Infrastructure automation](../pipelines/infra-apply.md)** - Learn about CI/CD for infrastructure

## Available Tools

### 🏗️ Terraform Modules

Production-ready modules available on the [Terraform Registry](https://registry.terraform.io/namespaces/pagopa-dx):

- **[Azure Core Infrastructure](https://registry.terraform.io/modules/pagopa-dx/azure-core-infra)** - Foundational networking, security, and monitoring
- **[Container App Environment](https://registry.terraform.io/modules/pagopa-dx/azure-container-app-environment)** - Scalable containerized applications
- **[Role Assignments](https://registry.terraform.io/modules/pagopa-dx/azure-role-assignments)** - Secure identity and access management

[**Browse all modules →**](https://registry.terraform.io/namespaces/pagopa-dx)

### 🔧 DX Provider

Custom Terraform provider for Azure resources:
- Simplified configuration for common patterns
- Built-in security best practices
- Integration with DX conventions

[**Learn about the DX provider →**](./contributing-to-dx-provider.md)

### 📋 Best Practices

- **[Pre-commit hooks](./pre-commit-terraform.md)** - Validate and format Terraform code
- **[Azure naming conventions](../conventions/azure-naming-convention.md)** - Consistent resource naming
- **[Folder structure](../conventions/infra-folder-structure.md)** - Organize Infrastructure as Code

## Azure Resources Guide

### Most Common Use Cases

- **[Setting up static web apps](./setting-up-azure-static-web-app.md)** - Deploy static sites with CI/CD
- **[IAM and security](./azure/azure-iam.md)** - Manage permissions and access control
- **[API Management](./azure/apim/index.md)** - Configure and secure APIs
- **[Monitoring and tracing](./azure/azure-tracing.md)** - Observability and debugging

[**View all Azure guides →**](./azure/index.md)

## Contributing

Help improve DX infrastructure tools:

- **[Contributing to Terraform modules](./contributing-to-dx-terraform-modules/index.md)** - Add new modules or improve existing ones
- **[Module documentation](./contributing-to-dx-terraform-modules/documenting-dx-terraform-modules.md)** - Keep docs up to date
- **[Testing and validation](./pre-commit-terraform.md)** - Ensure quality and consistency

## Getting Support

- **Issues with modules?** Open an issue on the [DX repository](https://github.com/pagopa/dx/issues)
- **Feature requests** We welcome suggestions for new modules
- **Questions?** Check existing [discussions](https://github.com/pagopa/dx/discussions) or start a new one

:::tip **Infrastructure as Code Best Practices**
Follow our [Infrastructure as Code guidelines](../conventions/infra-folder-structure.md) to ensure consistency across projects and teams.
:::
