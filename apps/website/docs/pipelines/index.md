---
sidebar_position: 5
---

# Using DX Pipelines

This section contains documentation about DX reusable workflows (GitHub
Actions). These workflows are designed to be easily integrated into your own
repositories, allowing you to automate common tasks such as code quality checks,
application deployment, and infrastructure automation.

## Available Workflows

### 🔍 Code Quality & Security

- **Code Review** - Comprehensive code quality checks
- **[Static Analysis](../terraform/static-analysis.md)** - Security and code
  quality scanning
- **[Drift Detection](../terraform/drift-detection.md)** - Monitor
  infrastructure changes

### 📦 Release & Versioning

- **[Release Action](./release.md)** - Automate package versioning and
  publishing

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
- **[OpEx Dashboard Deployment](./opex-dashboard.md)** - Automatically generate
  and deploy Azure Dashboards from OpenAPI specs
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

:::warning **Legacy Content**

The [legacy section](../legacy/index.md) contains deprecated workflows that are
no longer maintained. New projects should use the current workflows documented
above.

:::

:::tip **Pipeline Best Practices**

Follow our [Git conventions](../github/git/index.md) and
[pull request guidelines](../github/pull-requests/index.md) to get the most out
of DX pipelines. For questions or issues, visit our
[support page](../support.md).

:::
