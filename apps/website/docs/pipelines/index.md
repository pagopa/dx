---
sidebar_label: Pipelines
sidebar_position: 5
---

# Pipelines

This section contains documentation on GitHub Actions workflows that automate
the deployment of resources and applications, code quality checks, and security
scanning.

## Quick Start for Developers

New to DX pipelines? Start here:

1. **[Set up code review workflow](./code-review.md)** - Automated linting,
   testing, and security scanning
2. **[Deploy applications](./release-azure-appsvc.md)** - Zero-downtime releases
   to Azure App Service
3. **[Automate infrastructure](./infra-apply.md)** - Safe Terraform deployments

## Available Workflows

### 🔍 Code Quality & Security

- **[Code Review](./code-review.md)** - Comprehensive code quality checks
- **[Static Analysis](./static-analysis.md)** - Security and code quality
  scanning
- **[Drift Detection](./drift-detection.md)** - Monitor infrastructure changes

### 🚀 Application Deployment

- **[Azure App Service](./release-azure-appsvc.md)** - Deploy web applications
  and APIs
- **[Container Apps](./release-container-app.md)** - Deploy containerized
  applications
- **[Static Web Apps](./build-deploy-static-web-app.md)** - Deploy static sites
  with CDN
- **[CDN Deployment](./build-deploy-cdn-static-site.md)** - Deploy to Azure CDN

### 🏗️ Infrastructure Automation

- **[Infrastructure Planning](./infra-plan.md)** - Terraform plan and validation
- **[Infrastructure Apply](./infra-apply.md)** - Safe infrastructure deployments
- **[Azure Login](./azure-login.md)** - Secure authentication to Azure

### 🛠️ Build & Package

- **[Docker Image Build](./docker-image-build.md)** - Build and push container
  images
- **[CDN Deploy](./cdn-deploy.md)** - Deploy assets to content delivery networks

## Getting Started

### For Application Teams

1. **Choose your deployment target:**
   - Azure App Service → [App Service workflow](./release-azure-appsvc.md)
   - Container Apps → [Container App workflow](./release-container-app.md)
   - Static sites → [Static Web App workflow](./build-deploy-static-web-app.md)

2. **Set up code quality:**
   - Add [Code Review workflow](./code-review.md) to your repository
   - Configure [Static Analysis](./static-analysis.md) for security scanning

3. **Configure triggers:**
   - Learn about [workflow triggers](./triggers.md) and branch protection

### For Infrastructure Contributors

1. **Infrastructure automation:**
   - Learn about [Infrastructure Planning](./infra-plan.md) for pull requests
   - Understand [Infrastructure Apply](./infra-apply.md) for deployments
   - Help improve [Drift Detection](./drift-detection.md) for monitoring

2. **Security and compliance:**
   - Contribute to [Azure Login](./azure-login.md) patterns
   - Enhance [Static Analysis](./static-analysis.md) across repositories

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

- **[Legacy Workflows](./legacy/index.md)** - Information about deprecated
  workflows
- **[Migration Strategies](./legacy/index.md)** - How to upgrade to current
  workflows

:::warning **Legacy Content** The [legacy section](./legacy/index.md) contains
deprecated workflows that are no longer maintained. New projects should use the
current workflows documented above. :::

## Getting Support

- **Workflow issues?** Open an issue on the
  [DX repository](https://github.com/pagopa/dx/issues)
- **Feature requests** We welcome suggestions for new workflows
- **Questions?** Check existing
  [discussions](https://github.com/pagopa/dx/discussions)

:::tip **Pipeline Best Practices** Follow our
[Git conventions](../conventions/git/index.md) and
[pull request guidelines](../conventions/pull-requests/index.md) to get the most
out of DX pipelines. :::
