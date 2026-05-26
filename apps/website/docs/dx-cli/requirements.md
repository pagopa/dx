---
title: Requirements
sidebar_position: 1
description: Prerequisites and tools needed to use @pagopa/dx-cli.
---

# Requirements

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
