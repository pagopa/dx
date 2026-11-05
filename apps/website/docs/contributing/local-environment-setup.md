---
sidebar_label: Local Environment Setup
sidebar_position: 1
---

# Local Environment Setup

Set up your environment before contributing to the DX repository. Choose either
a local machine or the repository development container, then bootstrap the
repository.

## Choose Your Environment

### DevContainer (recommended)

The repository development container is configured with mise. Open the
repository in a supported IDE and select `Dev Containers: Reopen in Container`.

Alternatively, use the
[Dev Container CLI](https://github.com/devcontainers/cli):

```bash
pnpm install -g @devcontainers/cli
devcontainer up --workspace-folder .
devcontainer exec --workspace-folder . /bin/bash
```

### Local Machine

DX uses [mise](https://mise.jdx.dev/) to manage the tools declared in
[`mise.toml`](https://github.com/pagopa/dx/blob/main/mise.toml).

Install [mise](https://mise.jdx.dev/installing-mise.html) before continuing.

## Bootstrap the Repository

From the repository root, install the required tools and dependencies:

```bash
mise install
pnpm install
```
