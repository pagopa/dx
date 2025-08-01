# How to Contribute to DX

Thank you for your interest in contributing to the DX repository! This document outlines the steps to set up your development environment and guidelines for opening pull requests (PRs).

## Getting Started

### Use Dev Containers (Recommended)

We recommend using devcontainers to working with this repository. They ensure a consistent and isolated development environment, coming with pre-configured with all the necessary tools and dependencies for this project

#### Visual Studio Code or Any Supported IDE

Install DevContainer extension in your IDE ([VS Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) for example), run Docker or Rancher and spin the DX devcontainer by opening the command palette (`F1`) and selecting `Dev Containers: Reopen in Container`.

> [!TIP]
> If you are using macOS with [Rancher Desktop](https://rancherdesktop.io/), configure it to use `VZ` as _Virtual Machine Type_ and `virtiofs` as volume _Mount Type_.

#### Console

If you use a code editor that doesn't support Dev Container, you can still run it in your terminal.

1. Follow the instruction of the following chapter ("Using local machine") to setup your local environment
2. Run devcontainer from your terminal
   ```bash
   pnpm devcontainer up --workspace-folder .
   pnpm devcontainer exec -- workspace-folder . /bin/bash
   ```

### Local Development Setup (Alternative)

If you prefer not to use dev containers, you can bootstrap the local development on your machine.

This project uses specific versions of `node`, `pnpm` and `terraform`. To make sure your development setup matches with production follow the recommended installation methods.
1. Install and configure the follow tool in your machine

   - [nodenv](https://github.com/nodenv/nodenv) - Node version manager
   - [tfenv](https://github.com/tfutils/tfenv) - Terraform version manager
   - [terraform-docs](https://terraform-docs.io/user-guide/installation/) - Generate Terraform modules documentation in various formats
   - [tflint](https://github.com/terraform-linters/tflint) - A Pluggable Terraform Linter
   - [pre-commit](https://pre-commit.com/) - A framework for managing and maintaining multi-language pre-commit hooks

2. Install `node` at the right version used by this project

   ```bash
    cd path/to/DX
    nodenv install
   ```

3. Install `pnpm` using [corepack](https://nodejs.org/api/corepack.html) (Node Package Manager version manager, it is distributed with `node`). This step will also install all the required dependencies

   ```bash
   corepack enable
   pnpm install
   ```

4. Build all the workspaces contained by this repo
   ```bash
   pnpm run build
   ```

## Release management

We use [changesets](https://github.com/changesets/changesets) to automate package versioning and releases.

Each Pull Request that includes changes that require a version bump must include a _changeset file_ that describes the introduced changes.

To create a _changeset file_ run the following command and follow the instructions.

```bash
pnpm changeset
```

## Useful commands

This project uses `pnpm` and `turbo` with workspaces to manage projects and dependencies. Here is a list of useful commands to work in this repo.

### Work with workspaces

```bash
# build all the workspaces using turbo
pnpm build
# or
pnpm turbo build
# to execute COMMAND on WORKSPACE_NAME
pnpm --filter WORKSPACE_NAME run command
# run unit tests on citizen-func
pnpm --filter citizen-func run test
# or (with turbo)
pnpm turbo test -- citizen-func
```

### Add dependencies

```bash
# add a dependency to the workspace root
pnpm add turbo
# add a dependency to a specific workspace
pnpm --filter WORKSPACE_NAME add dependency-name
```

Thank you for contributing to DX!
