---
title: Installation
sidebar_position: 1
description: Prerequisites and installation options for @pagopa/dx-cli.
---

# Installation

This page collects the prerequisites and installation options for
`@pagopa/dx-cli`.

## Requirements

The following tools must be installed on your machine:

| Tool                                                                                                        | Version                                       |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [Node.js](https://nodejs.org/)                                                                              | **>= 22.0.0**                                 |
| [Terraform](https://developer.hashicorp.com/terraform/install) or [tfenv](https://github.com/tfutils/tfenv) | latest                                        |
| [GitHub CLI](https://cli.github.com/)                                                                       | latest                                        |
| [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)                                  | latest (required for Azure environments only) |

Before running any command that interacts with GitHub or a cloud provider,
ensure you are logged in:

```bash
gh auth login
```

```bash
az login
```

:::warning[Azure session expiry]

Within PagoPA, `az login` sessions expire every **12 hours**. If a command fails
with an authentication error, run `az login` again before retrying.

:::

## Installation

You can invoke the CLI directly via `npx` without installing globally:

```bash
npx @pagopa/dx-cli --help
```

When installed locally in a monorepo you can also run:

```bash
pnpm dx --help
```

> The binary name is `dx`.
