---
sidebar_position: 1
---

# Developer Experience Initiative

:::warning

This initiative (expecially its documentation) is a work in progress. As of now
(Jun 2024), we're near to release the first version of our tools and docs. Stay
tuned!

:::

## What this is all about

Whether it's your first day or you've been an engineer at PagoPA for years, your
goal is to make an impact. However, the multitude of tools, platforms, and
processes can be overwhelming.

Don't worry, we've all been there! This initiative aims to make your journey as
smooth and enjoyable as possible.

You probably want to start writing your first API or building your first UI
components as soon as you can. To do that, you need to know how to:

- **Structure** your work (e.g., monorepo vs. polyrepo).
- **Select** the right tools and framework.
- **Architect** your services using the right PaaS.
- **Configure** your services using Infrastructure as Code.
- **Deploy** your application logic to production.
- **Secure** your services and manage permissions efficiently.
- **Monitor** your services and troubleshoot issues.

All of this, ensuring everything is efficient, scalable and aligned to our
Technology Standards.

Making these decisions can be complex and time-consuming. The
[Developer Experience Initiative](https://github.com/pagopa/dx) (DX) is here to
help you with _golden paths_ and best practices.

### How this differs from Technology Standards iniative?

While Technology Standards aim is to define best practices and guidelines for
well architected solutions, leaving every choice to the teams, the DX initiative
aims to provide **strongly opinionated** tools and workflows to implement the
Technology Standards.

:::info

We think that engineers should focus on **provide value to end users** rather
than spending time on technical choices.

:::

Moreover, the
[DX team](https://github.com/orgs/pagopa/teams/engineering-team-devex) is
available to support you if you choose to adopt these golden paths. However,
you're always free to make your own choices, though this might require more time
and effort and you may miss out on some of the benefits of this support.

This initiative is designed to tackle these challenges and simplify your daily
work, no matter how long you've been with us. With the right information at your
fingertips, you'll confidently navigate our tech ecosystem, solving problems and
creating effective solutions.

## DX in practice

- **Golden Paths**: We provide golden paths, aligned with our
  [Technology Radar](https://pagopa.github.io/technology-radar/index.html), to
  help you avoid wasting precious effort on unnecessary choices.
- **Tools**: We offer tools (e.g., Terraform abstractions) to help you follow
  PagoPA Technology Standards easily.
- **Training**: We conduct workshops and training to help you understand and
  apply golden paths and best practices.
- **Support**: We offer concrete support to help you apply these guidelines and
  best practices in your daily work.

## Current status

We're currently working on the following:

- [x] Terraform configuration for GitHub Action runners that have access to
      Azure
- [x] Github Actions to plan and apply changes to Azure infrastructure
- [x] Terraform abstractions to deploy Typescript applications on Azure
- [x] Sane Typescript (eslint) linting presets
- [ ] Templates for Typescript applications (serverless, express, etc.)
- [ ] Documentation for the above items

If you wonder why we're working with these specific technologies, check out our
[Achitecture decision records](https://github.com/pagopa/dx/tree/main/decisions).

We're going to update this list as we progress and - eventually - consider other
languages (e.g., JAVA), and platforms (e.g., AWS).

## How to stay updated

We're glad you're interested! You may stay updated watching our
[GitHub repository](https://github.com/pagopa/dx).

We will publish a blog post with a changelog every time we release a new
significant feature or update. You'll find these posts on our
[documentation website](https://pagopa.github.io/dx/).

## How to contribute

We're always looking for contributors to help improve our documentation and
tools. If you're interested in contributing, please check out the
[dx repository on GitHub](https://github.com/pagopa/dx). Feel free to open an
[issue](https://github.com/pagopa/dx/issues) or submit a pull request with any
suggestions or improvements!
