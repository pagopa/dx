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
   nx run-many -t build
   ```

## Release management

We use [changesets](https://github.com/changesets/changesets) to automate package versioning and releases.

Each Pull Request that includes changes that require a version bump must include a _changeset file_ that describes the introduced changes.

To create a _changeset file_ run the following command and follow the instructions.

```bash
pnpm changeset
```

## Useful commands

This project uses `pnpm` and `nx` with workspaces to manage projects and dependencies. Here is a list of useful commands to work in this repo.

### Work with workspaces

````bash
# build all the workspaces using Nx
nx run-many -t build
# to execute COMMAND on WORKSPACE_NAME
nx run WORKSPACE_NAME:COMMAND
# run unit tests on @pagopa/dx-cli
nx run @pagopa/dx-cli:test
# or (shorthand)
nx test @pagopa/dx-cli

### Add dependencies

```bash
# add a dependency (nx) to the workspace root
pnpm add -w nx
# add zod to the @pagopa/dx-cli workspace
pnpm --filter @pagopa/dx-cli add zod
````

# SBOM Management

## What is an SBOM

An SBOM (Software Bill of Materials) is a formal, machine-readable inventory of
software components and dependencies contained in an application. It provides a
detailed list of all the libraries, frameworks, and modules that make up the
software, along with their versions and licenses.

## SBOM Management Script

To generate SBOMs, this project includes a
[script](https://github.com/pagopa/dx/blob/main/sbom.sh) that automates their
creation, updates, and validation.

### Requirements

Before using the script, you need to have the following tools installed on your
system:

- **[Syft](https://github.com/anchore/syft)**: A CLI tool for generating SBOMs
  from container images and filesystems.
- **[Grype](https://github.com/anchore/grype)**: A vulnerability scanner for
  container images and filesystems.

You can find installation instructions on their official GitHub pages.

### Usage

The root `package.json` includes the following scripts to manage SBOMs:

- **To generate all SBOMs**:

  ```sh
  pnpm sbom-generate
  ```

- **To validate existing SBOMs**:

  ```sh
  pnpm sbom-validate
  ```

---

Thank you for contributing to DX!
