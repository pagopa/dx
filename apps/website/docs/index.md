---
sidebar_position: 1
title: Developer Experience at PagoPA
description:
  Accelerate your development with proven tools, patterns, and best practices
  for building scalable applications on Azure.
keywords:
  [
    developer experience,
    pagopa,
    azure,
    terraform,
    typescript,
    devops,
    infrastructure,
    contributing,
  ]
---

# Developer Experience at PagoPA

## 🚀 Accelerate Your Development Journey

Whether you're shipping your first API or architecting complex distributed
systems, the PagoPA Developer Experience (DX) initiative provides **golden
paths** and **battle-tested tools** to help you build with confidence.

:::tip **Ready to start building?** Jump to our
[Quick Start Guides](#quick-start-guides) tailored for your role, or explore our
[featured tools](#featured-tools) below. :::

## What We Provide

**🛤️ Golden Paths** - Opinionated, proven approaches aligned with our
[Technology Radar](https://pagopa.github.io/technology-radar/)

**🔧 Ready-to-Use Tools** - Terraform modules, GitHub Actions, and development
environments that just work

**📚 Comprehensive Guides** - Step-by-step documentation from setup to
production deployment

**🤝 Expert Support** - Direct access to the
[DX team](https://github.com/orgs/pagopa/teams/engineering-team-devex) for
guidance and troubleshooting

## Quick Start Guides

Choose your path based on your role and goals:

<div className="row">

<div className="col col--4">

### 👩‍💻 **Application Developer**

Ready to build your first service?

- [Set up your development environment](getting-started/index.md)
- [Build and deploy a TypeScript API](pipelines/release-azure-appsvc.md)
- [Follow our coding conventions](conventions/index.md)

[**Start Building →**](getting-started/index.md)

</div>

<div className="col col--4">

### 🏗️ **Infrastructure Contributor**

Contributing to infrastructure and tooling?

- [Contribute to Terraform modules](infrastructure/contributing-to-dx-terraform-modules/index.md)
- [Learn Azure patterns and practices](infrastructure/azure/index.md)
- [Understand infrastructure pipelines](pipelines/infra-apply.md)

[**Start Contributing →**](infrastructure/contributing-to-dx-terraform-modules/index.md)

</div>

<div className="col col--4">

### 🆕 **New to PagoPA**

First day at PagoPA?

- [Understand our approach](getting-started/index.md)
- [Set up your monorepo workspace](getting-started/monorepository-setup.md)
- [Get familiar with our conventions](conventions/index.md)

[**Get Oriented →**](getting-started/index.md)

</div>

</div>

## Featured Tools

### 🏛️ **Infrastructure as Code**

Production-ready Terraform modules for Azure resources:

- **Azure Core Infrastructure** - Networking, security, and monitoring
  foundations
- **Application Services** - Container apps, function apps, and API management
- **Data & Storage** - Cosmos DB, Service Bus, and storage accounts

[**Browse All Modules →**](https://registry.terraform.io/namespaces/pagopa-dx) |
[**Contributing Guide →**](infrastructure/contributing-to-dx-terraform-modules/index.md)

### ⚙️ **GitHub Actions Workflows**

Reusable workflows for common scenarios:

- **Code Review** - Automated linting, testing, and security scanning
- **Infrastructure** - Safe Terraform planning and deployment
- **Application Deployment** - Zero-downtime releases to Azure

[**View All Workflows →**](pipelines/index.md) |
[**GitHub Repository →**](https://github.com/pagopa/dx/tree/main/.github)

### 📋 **Development Standards**

Consistent approaches across teams:

- **Git Workflows** - Branch naming, commit messages, and PR guidelines
- **Azure Naming** - Resource naming conventions and tagging strategies
- **Project Structure** - Monorepo organization and folder hierarchies

[**View All Conventions →**](conventions/index.md)

## Navigation Guide

<div className="row">

<div className="col col--3">

**🚀 [Getting Started](getting-started/index.md)** New to DX? Start here for
onboarding and setup guides

</div>

<div className="col col--3">

**📚 [Infrastructure](infrastructure/index.md)** Azure resources, Terraform
modules, and infrastructure patterns

</div>

<div className="col col--3">

**⚙️ [Pipelines](pipelines/index.md)** GitHub Actions workflows for CI/CD and
automation

</div>

<div className="col col--3">

**📋 [Conventions](conventions/index.md)** Standards for Git, naming, project
structure, and code quality

</div>

</div>

## Current status

We're working on the following:

- [x] Terraform configuration for GitHub Action runners with Azure access
- [x] Custom Terraform modules for common Azure resources
- [x] GitHub Actions to plan and apply infrastructure changes
- [x] GitHub Actions for safe deployment of TypeScript applications on Azure
- [x] Standardized TypeScript linting presets (eslint)
- [ ] Scaffold templates for TypeScript applications (monorepo)
- [ ] Scaffold templates for Terraform modules
- [ ] Complete web application template using Next.js
- [ ] OpenAPI client generator for TypeScript
- [ ] OpenAPI server generator for TypeScript
- [ ] Documentation for all the above items

If you wonder why we're working with these specific technologies, check out our
[Architecture decision records](https://github.com/pagopa/dx/tree/main/decisions).

We're going to update this list as we progress and - eventually - consider other
languages (e.g., JAVA), and platforms (e.g., AWS).

Aside, we experiment with _new_ technologies and tools to improve our daily
work.

## Stay Connected

**📖 [Read our blog](https://pagopa.github.io/dx/blog/)** for the latest updates
and feature announcements

**⭐ [Watch our repository](https://github.com/pagopa/dx)** to stay informed
about new releases

**🐛
[Report issues or suggest improvements](https://github.com/pagopa/dx/issues)** -
we welcome your feedback!

## Contributing

We're building this platform together! Whether you're fixing a typo or proposing
a new tool, your contributions make DX better for everyone.

- **📝 Improve documentation** - Found something unclear? Submit a PR!
- **🔧 Contribute tools** - Share reusable modules and workflows
- **💡 Share ideas** - Open an issue to discuss new features

[**Read our contribution guide →**](https://github.com/pagopa/dx/blob/main/CONTRIBUTING.md)

---

_Built with ❤️ by the PagoPA DX Team |
[Powered by Docusaurus](https://docusaurus.io/)_
