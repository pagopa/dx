---
sidebar_position: 4
---

# Connecting Azure Resources Securely

This section provides comprehensive guides for configuring and managing network
connectivity in Azure environments. Learn how to set up secure connections,
manage TLS certificates, verify service reachability, and establish
cross-subscription networking using Azure's networking services.

## Key Topics

- **[Adding TLS Certificate to Application Gateway](./app-gateway-tls-cert.md)**:
  Step-by-step guide for attaching TLS certificates from Azure Key Vault to
  Application Gateway and setting up renewal alerts.
- **[Creating TLS Certificates](./creating-tls-cert.md)**: Complete workflow for
  creating and managing TLS certificates with automatic renewal using Terraform,
  PowerShell, and Azure Key Vault.
- **[App Service Plan DNS Resolution](./appservice-plan-dns-resolution.md)**:
  How to verify online service reachability and DNS resolution from App Service
  Plans before production deployments.
- **[Cross-Subscription Private Endpoints](./peps-cross-subscription.md)**:
  Guide for connecting Azure resources across different subscriptions using
  Private Endpoints with Terraform.
