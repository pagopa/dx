---
sidebar_position: 5
---

# Managing DX Pipelines

This section contains documentation on GitHub Actions workflows that automate
the deployment of resources and applications, code quality checks, and security
scanning.

## Quick Start for Developers

New to DX pipelines? Start here:

1. **Set up code review workflow** - Automated linting, testing, and security
   scanning
2. **[Deploy applications](../azure/application-deployment/release-azure-appsvc.md)** -
   Zero-downtime releases to Azure App Service
3. **[Automate infrastructure](../terraform/infra-apply.md)** - Safe Terraform
   deployments

## Available Workflows

### 🔍 Code Quality & Security

- **Code Review** - Comprehensive code quality checks
- **[Static Analysis](../terraform/static-analysis.md)** - Security and code
  quality scanning
- **[Drift Detection](../terraform/drift-detection.md)** - Monitor
  infrastructure changes

### 🚀 Application Deployment

- **[Azure App Service](../azure/application-deployment/release-azure-appsvc.md)** -
  Deploy web applications and APIs
- **[Container Apps](../azure/application-deployment/release-container-app.md)** -
  Deploy containerized applications
- **[Static Web Apps](../azure/static-websites/build-deploy-static-web-app.md)** -
  Deploy static sites with CDN
- **[Static Assets Deployment](../azure/static-websites/build-deploy-static-assets.md)** -
  Deploy to Azure CDN

### 🏗️ Infrastructure Automation

- **[Infrastructure Planning](../terraform/infra-plan.md)** - Terraform plan and
  validation
- **[Infrastructure Apply](../terraform/infra-apply.md)** - Safe infrastructure
  deployments
- **[Azure Login](../azure/iam/azure-login.md)** - Secure authentication to
  Azure

### 🛠️ Build & Package

- **Docker Image Build** - Build and push container images
- **[Static App Deploy](../azure/static-websites/static-assets-deploy.md)** -
  Deploy assets to content delivery networks

## Getting Started

### For Application Teams

1. **Choose your deployment target:**
   - Azure App Service →
     [App Service workflow](../azure/application-deployment/release-azure-appsvc.md)
   - Container Apps →
     [Container App workflow](../azure/application-deployment/release-container-app.md)
   - Static sites →
     [Static Web App workflow](../azure/static-websites/build-deploy-static-web-app.md)

2. **Set up code quality:**
   - Add Code Review workflow to your repository
   - Configure [Static Analysis](../terraform/static-analysis.md) for security
     scanning

3. **Configure triggers:**
   - Learn about [workflow triggers](./triggers.md) and branch protection

4. **Deploy infrastructure:**
   - Set up [Infrastructure Planning](../terraform/infra-plan.md) for pull
     requests
   - Configure [Infrastructure Apply](../terraform/infra-apply.md) for
     deployments
   - Enable [Drift Detection](../terraform/drift-detection.md) for monitoring
   - Implement [Azure Login](../azure/iam/azure-login.md) patterns

## Workflow Features

### 🔒 Security Built-in

- Secure Azure authentication with OIDC
- Automated security scanning and vulnerability detection
- Secrets management and rotation

### 📊 Observability

- Detailed workflow logs and reporting
- Integration with Azure monitoring
- Drift detection and alerting

### 🔄 Reliability

- Zero-downtime deployment strategies
- Rollback capabilities
- Health checks and validation

## Migration and Legacy

Moving from older workflows? Check our migration guides:

- **[Legacy Workflows](../legacy/index.md)** - Information about deprecated
  workflows
- **[Migration Strategies](../legacy/index.md)** - How to upgrade to current
  workflows

:::warning **Legacy Content** The [legacy section](../legacy/index.md) contains
deprecated workflows that are no longer maintained. New projects should use the
current workflows documented above. :::

## Getting Support

- **Workflow issues?** Open an issue on the
  [DX repository](https://github.com/pagopa/dx/issues)
- **Feature requests** We welcome suggestions for new workflows

:::tip **Pipeline Best Practices** Follow our
[Git conventions](../github/git/index.md) and
[pull request guidelines](../github/pull-requests/index.md) to get the most out
of DX pipelines. :::
