---
sidebar_position: 1
title: Getting Started with PagoPA DX
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

---

sidebar_position: 1 title: Getting Started with PagoPA DX description:
Accelerate your development with proven tools, patterns, and best practices for
building scalable applications on Azure. keywords: [ developer experience,
pagopa, azure, terraform, typescript, devops, infrastructure, contributing, ]

---

# Getting Started with PagoPA DX

## 🚀 Accelerate Your Development Journey

Whether you're shipping your first API or architecting complex distributed
systems, the PagoPA Developer Experience (DX) initiative provides **golden
paths** and **battle-tested tools** to help you build with confidence.

:::tip **Ready to start building?**

Jump to our [Quick Start Guides](#choose-your-path) tailored for your role, or
explore our [featured tools](#featured-tools) below.

:::

## Prerequisites to adopt DX tools

### Mono Repository: Yes Please!

:::warning **Mono Repository Required**

Using a mono repository is a prerequisite to adopt DX tooling.

:::

[Mono repositories offer several advantages](https://pagopa.github.io/technology-radar/methods-and-patterns/monorepo.html),
and DX tools are designed with this in mind. We recommend using a mono
repository, even for a single project or workspace.

To start adopting DX tools, define boundaries for team services and plan how to
split team projects. Once ready, ensure you have a mono-repository on GitHub and
start [configuring it using DX tools](monorepository-setup.md).

### Supported Platforms

DX tools are designed to integrate seamlessly with GitHub, support multiple
Cloud Service Providers (CSPs), and align with a variety of programming
languages.

These tools adhere to the principles and boundaries outlined in our
[Technology Radar](https://pagopa.github.io/technology-radar/index.html) that
teams are expected to follow.

Technology Radar recommendations are thoughtfully designed to foster
consistency, efficiency, and alignment across projects, ensuring a streamlined
development experience.

### Conventions

DX provides guidance to help teams adopt shared conventions during their
journey:

- [Optimize Git usage](conventions/git/index.md) usage.
- [Create effective Pull Requests](conventions/pull-requests/index.md).
- [Name Azure resources](azure/azure-naming-convention.md) consistently.
- [Organize repository folders](conventions/infra-folder-structure.md) for
  Infrastructure as Code (IaC) sources.

We expect teams to adhere to these conventions to ensure a consistent experience
across all projects. Some of them are enforced by DX tools, while others are
optional but highly recommended.

## Choose Your Path

### 👩‍💻 Application Developers

If you're building APIs, web applications, or services:

1. **[Set up your development environment](monorepository-setup.md)** -
   Configure your workspace for PagoPA development
2. **[Understand our conventions](conventions/index.md)** - Learn our Git
   workflows, naming conventions, and code standards
3. **[Deploy applications](pipelines/index.md)** - Automate your deployments
   with GitHub Actions
4. **[Deploy infrastructure](terraform/index.md)** - Use Terraform modules to
   deploy Azure resources

**Quick wins:**

- Use our [pre-configured dev containers](dev-containers/index.md) for instant
  environment setup
- Follow our [Git conventions](conventions/git/index.md) for consistent
  collaboration
- Deploy apps with our
  [TypeScript deployment workflows](azure/release-azure-appsvc.md)
- Deploy infrastructure with our
  [Terraform modules](terraform/using-terraform-registry-modules.md)

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

## Featured Tools

### 🏛️ **Infrastructure as Code**

Production-ready Terraform modules for Azure resources:

All DX Terraform modules are available on
[the public Terraform Registry](https://registry.terraform.io/namespaces/pagopa-dx)
under the `pagopa-dx` organization.

Of course,
[everyone can contribute](./contributing/contributing-to-dx-terraform-modules.md)
to improve them.

- **Azure Core Infrastructure** - Networking, security, and monitoring
  foundations
- **Application Services** - Container apps, function apps, and API management
- **Data & Storage** - Cosmos DB, Service Bus, and storage accounts

### ⚙️ **GitHub Actions Workflows**

Reusable workflows for common scenarios:

The DX repository provides several
[GitHub reusable workflows](https://github.com/pagopa/dx/tree/main/.github)
documented in the [pipelines section](pipelines/index.md) of this website.

We encourage teams to use these templates as a starting point for their GitHub
Actions workflows. They are designed to speed up continuous integration and
delivery for team apps and IaC code.

These templates cover various scenarios, such as code validation, web app
deployment (including FaaS!), building and pushing Docker images to
[GitHub registry](https://github.com/orgs/pagopa/packages?repo_name=dx), and
more. Feel free to choose the ones that best suit team needs!

- **Code Review** - Automated linting, testing, and security scanning
- **Infrastructure** - Safe Terraform planning and deployment
- **Application Deployment** - Zero-downtime releases to Azure

### 📋 **Development Standards**

Consistent approaches across teams:

- **Git Workflows** - Branch naming, commit messages, and PR guidelines
- **Azure Naming** - Resource naming conventions and tagging strategies
- **Project Structure** - Monorepo organization and folder hierarchies

[**View All Conventions →**](conventions/index.md)

## Navigation Guide

<div className="row">

<div className="col col--3">

**🚀 [Getting Started](#)** New to DX? Start here for onboarding and setup
guides

</div>

<div className="col col--3">

**📚 [Infrastructure](./terraform/index.md)** Azure resources, Terraform
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

## Getting Support

The [DX team](https://github.com/orgs/pagopa/teams/engineering-team-devex) is
here to help:

- **Questions?** Open a [GitHub issue](https://github.com/pagopa/dx/issues)
- **Bug reports** Use our issue templates for faster resolution
- **Feature requests** We're always looking for ways to improve
- **Direct support** Available for teams adopting DX golden paths

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

We encourage you to contribute to the DX project! Start by reviewing our
[contribution guidelines](https://github.com/pagopa/dx/blob/main/CONTRIBUTING.md)
to understand how you can get involved and make a meaningful impact.

:::tip **Need help deciding?**

Not sure which path to take? Check out our
[conventions overview](conventions/index.md) to understand how we organize work
at PagoPA, or reach out to the DX team on
[GitHub](https://github.com/pagopa/dx/issues).

:::

---

_Built with ❤️ by the PagoPA DX Team |
[Powered by Docusaurus](https://docusaurus.io/)_
