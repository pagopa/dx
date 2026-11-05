---
title: "Azure App Configuration"
ring: assess
tags: [cloud, azure, configuration]
---

[Azure App Configuration](https://learn.microsoft.com/en-us/azure/azure-app-configuration/overview)
is a managed service that provides a centralized store for application settings
and feature flags. It complements
[Azure Key Vault](https://azure.microsoft.com/en-us/products/key-vault), which
remains the place for secrets: App Configuration focuses on non-secret settings
that benefit from hierarchical keys, labels, point-in-time snapshots, revision
history, and soft delete. It natively supports feature flag management, and it
integrates with
[App Service](https://azure.microsoft.com/en-us/products/app-service),
[Function Apps](https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview?pivots=programming-language-csharp),
[Container Apps](https://azure.microsoft.com/en-us/products/container-apps),
and
[Managed Identity](https://learn.microsoft.com/en-us/azure/app-configuration/howto-integrate-azure-managed-identity)
to retrieve configuration at runtime without storing connection strings.

## Use cases

- Centralize application settings shared across services and environments,
  using hierarchical keys and labels to model the environment dimension
- Manage feature flags and progressive rollouts (e.g. beta access, canary
  releases) without redeploying applications
- Keep an auditable history of configuration changes with snapshots and
  revision history
- Integrate configuration with Key Vault references, so applications read
  secrets transparently from Key Vault through App Configuration

## Reference of usage in our organization

Not yet used in our organization; under assessment as a candidate to manage
application settings and feature flags across environments.
