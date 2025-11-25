---
sidebar_position: 7
---

# Managing AppSettings and Secrets With Azure

This documentation provides guidance on managing application settings and
secrets efficiently using Azure services. It includes best practices for secure
storage, retrieval, and management of sensitive configuration data in your
applications.

## Key Concepts

Azure AppConfiguration can manage appsettings, secrets and feature flags. These
can be imported via a JSON file, that can be defined next to the application
code, and deployed to the AppConfiguration instance via the same GitHub Actions
used by the application.

The application needs to install the
[official Azure App Configuration SDK](https://learn.microsoft.com/en-us/azure/azure-app-configuration/quickstart-javascript-provider?tabs=entra-id)
to fetch settings, secrets and feature flags at runtime. The SDK supports
hot-reload of settings, so that changes in the AppConfiguration instance are
reflected in the application without requiring a restart/deploy. Application can
also access secrets stored in KeyVault through AppConfiguration, simplifying the
management of sensitive data. Feature flags offer flexibility in dynamically
enabling or disabling features without redeploying the application, using
built-in or custom rules.

Moreover, it removes the need to set environment variables via Terraform, which
slow down development and deploying, other than storing sensitive configuration
data directly in the Terraform state file.

A collection of code samples is available
[on GitHub](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/appconfiguration/app-configuration/samples/v1/typescript/src).

## Key Topics

- **[Setting up Azure App Configuration and KeyVault](./azure-app-configuration.md)**:
  Detailed instructions on how to set up and use Azure App Configuration service
  for managing application settings and secrets.
- **[Getting started with your application to use Azure App Configuration](./app-configuration-usage.md)**:
  Instructions on how to integrate Azure App Configuration SDK into your
  application for retrieving settings, secrets, and feature flags.
- **[Defining Application Settings, Secrets and Feature Flags](./appsettings-definition.md)**:
  Guide on how to define and organize application settings, secrets, and feature
  flags within Azure App Configuration and KeyVault.
- **[Updating GitHub Actions to deploy settings and secrets within the application](./appsettings-deploy.md)**:
  Guide on deploying application settings and secrets to Azure App Configuration
  instance.
