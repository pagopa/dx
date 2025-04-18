---
sidebar_label: Getting Started
sidebar_position: 2
---

# Getting Started

Getting started with DX tooling can sometimes feel overwhelming, as it covers a
wide range of scenarios. This page provides initial guidance to help understand
core concepts and start using DX tools effectively.

DX tools may be **adopted incrementally**, so you can start with a single tool
and gradually expand your usage. However, some tools are designed to work
assuming some prerequisites are already in place.

We know you're eager to dive in and start coding, but spending a few minutes on
this section may save you from getting stuck later 🫷.

## Prerequisites to adopt DX tools

### Mono Repository: Yes Please!

Using a mono repository is a prerequisite to adopt DX tooling.

[Mono repos offer several advantages](https://pagopa.github.io/technology-radar/methods-and-patterns/monorepo.html),
and DX tools are designed with them in mind.

To start adopting DX tools, define boundaries for team services and plan how to
split team projects. Once ready, ensure you have a mono-repository on GitHub and
start [configuring it using DX tools](./monorepository-setup.md).

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

:::info

Currently, we support Azure and TypeScript. We are actively working on adding
support for AWS and Java as well.

:::

### Conventions

DX provides guidance to help teams adopt shared conventions during their
journey:

- [Optimize Git usage](../conventions/git/index.md) usage.
- [Create effective Pull Requests](../conventions/pull-requests/index.md).
- [Name Azure resources](../conventions/azure-naming-convention.md)
  consistently.
- [Organize repository folders](../conventions/infra-folder-structure.md) for
  Infrastructure as Code (IaC) sources.

We expect teams to adhere to these conventions to ensure a consistent experience
across all projects. Some of them are enforced by DX tools, while others are
optional but highly recommended.

## DX Tools

DX tools are designed to be modular and reusable. They can be used independently
or in combination, depending on team needs. The following tools are currently
available.

### Infrastructure as Code (IaC)

All DX Terraform modules are available on
[the public Terraform Registry](https://registry.terraform.io/namespaces/pagopa-dx)
under the `pagopa-dx` organization.

Of course,
[everyone can contribute](https://pagopa.github.io/dx/docs/infrastructure/contributing-to-dx-terraform-modules/)
to improve them.

### GitHub Workflows

The DX repository provides several
[GitHub reusable workflows](https://github.com/pagopa/dx/tree/main/.github)
documented in the [pipelines section](../pipelines/index.md) of this website.

We encourage teams to use these templates as a starting point for their GitHub
Actions workflows. They are designed to speed up continuous integration and
delivery for team apps and IaC code.

These templates cover various scenarios, such as code validation, web app
deployment (including FaaS!), building and pushing Docker images to
[GitHub registry](https://github.com/orgs/pagopa/packages?repo_name=dx), and
more. Feel free to choose the ones that best suit team needs!

## Resources

If DX tooling is appreciated, there's much more to discover on this website:

- **Articles**: Guidance for common use cases.
- **Conventions**: Predefined conventions to better organize resources.
- **Infrastructure**: DX tooling for cloud-related topics.
- **Pipelines**: DX tooling for GitHub Actions.

Stay up to date with DX [blog](https://pagopa.github.io/dx/blog/)!

## Contributing

If you have any suggestions, ideas, or feedback, please don't hesitate to reach
out to us. We are always open to new ideas and improvements.

We encourage you to contribute to the DX project! Start by reviewing our
[contribution guidelines](https://github.com/pagopa/dx/blob/main/CONTRIBUTING.md)
to understand how you can get involved and make a meaningful impact.
