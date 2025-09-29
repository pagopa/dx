---
sidebar_position: 11
---

# Deprecated Legacy Tools

This section provides information about legacy workflows that are no longer
actively maintained but may still be in use in some projects. These workflows
are part of the transition to a monorepo architecture and are provided for
reference only.

:::warning

It is strongly recommended to migrate to the new workflows as soon as possible.
Legacy workflows will be removed in a future release and do not receive security
updates or bug fixes.

:::

## Migration Guide

### Quick Migration Steps

1. **Audit current workflows** - Review which legacy workflows your project uses
2. **Choose replacement workflows** - Select modern equivalents from the
   [pipelines section](../index.md)
3. **Update configuration** - Modify workflow files to use new syntax and
   features
4. **Test thoroughly** - Ensure new workflows work correctly in staging
5. **Deploy to production** - Replace legacy workflows with modern versions

### Legacy → Modern Workflow Mapping

| Legacy Workflow                                               | Modern Replacement                                                            | Benefits                                   |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| [Legacy Code Review](./legacy-code-review.md)                 | Code Review (planned)                                                         | Faster execution, better security scanning |
| [Legacy Deploy Pipelines](./legacy-deploy-pipelines-azure.md) | [App Service Deploy](../azure/application-deployment/release-azure-appsvc.md) | Zero-downtime deployment, better rollback  |
| [Legacy Publish SDK](./legacy-publish-sdk.md)                 | Docker Image Build (planned)                                                  | Multi-platform support, optimized caching  |

## Legacy Workflows

### Code Quality (Deprecated)

- **[Legacy Code Review](./legacy-code-review.md)** - Original code review
  workflow for Node.js projects
  - ⚠️ **Use instead:** Modern Code Review (planned)
  - **Migration effort:** Low - mostly configuration changes

### Deployment (Deprecated)

- **[Legacy Deploy Pipelines](./legacy-deploy-pipelines-azure.md)** - Original
  Azure deployment workflows
  - ⚠️ **Use instead:**
    [App Service Deploy](../azure/application-deployment/release-azure-appsvc.md)
    or
    [Container App Deploy](../azure/application-deployment/release-container-app.md)
  - **Migration effort:** Medium - may require application changes

### Package Publishing (Deprecated)

- **[Legacy Publish SDK](./legacy-publish-sdk.md)** - Original package
  publishing workflow
  - ⚠️ **Use instead:** Docker Image Build (planned)
  - **Migration effort:** Low - mainly configuration updates

## Support Timeline

| Status                | Description                         | End Date |
| --------------------- | ----------------------------------- | -------- |
| 🔴 **Deprecated**     | No new features, critical bugs only | Current  |
| 🚫 **End of Support** | No updates, removal warnings        | Q2 2024  |
| ❌ **Removal**        | Workflows deleted from repository   | Q4 2024  |

## Migration Support

### Getting Help

The DX team provides migration support:

- **[Migration checklist](https://github.com/pagopa/dx/issues/new?template=migration.md)** -
  Step-by-step guidance
- **Direct support** - Available for teams migrating from legacy workflows
- **Documentation** - Comprehensive guides for each modern workflow

### Common Migration Issues

**Authentication Changes**

- Legacy workflows use service principals
- Modern workflows use OIDC authentication
- [Learn about Azure Login setup](../azure/iam/azure-login.md)

**Configuration Format**

- Legacy workflows use different input parameters
- Modern workflows have simplified configuration
- Check individual workflow documentation for specifics

**Feature Gaps**

- Some legacy features may not have direct equivalents
- Contact the DX team if you need specific functionality

## Why Migrate?

### Security Improvements

- **OIDC Authentication** - More secure than service principals
- **Updated Dependencies** - Latest versions with security patches
- **Vulnerability Scanning** - Built-in security checks

### Performance Benefits

- **Faster Execution** - Optimized for speed and reliability
- **Better Caching** - Reduced build times
- **Parallel Execution** - Multiple jobs run simultaneously

### Feature Enhancements

- **Zero-Downtime Deployment** - Rolling updates with health checks
- **Advanced Rollback** - Automatic rollback on failure
- **Better Observability** - Enhanced logging and monitoring

:::tip **Migration Priority** Focus on migrating workflows in this order:

1. **Security-related workflows** (authentication, scanning)
2. **Production deployment workflows** (high-risk if they fail)
3. **Development workflows** (code review, testing) :::

## Getting Started with Migration

1. **[Review current pipelines documentation](../index.md)** to understand
   modern alternatives
2. **[Open a migration issue](https://github.com/pagopa/dx/issues/new)** to get
   personalized guidance or to ask questions and share experiences
