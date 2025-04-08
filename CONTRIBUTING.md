# How to Contribute to DX

Thank you for your interest in contributing to the DX repository! This document outlines the steps to set up your development environment and guidelines for opening pull requests (PRs).

## Getting Started

### Use Dev Containers (Recommended)

We recommend using devcontainers to working with this repository. They ensure a consistent and isolated development environment, coming with pre-configured with all the necessary tools and dependencies for this project

Install DevContainer extension in your IDE ([VS Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) for example), run Docker or Rancher and spin the DX devcontainer by opening the command palette (`F1`) and selecting `Dev Containers: Reopen in Container`.

### Local Development Setup (Alternative)

If you prefer not to use dev containers, you can bootstrap your local development environment by following these steps:

#### Prerequisites

1. **Node.js**

   - Use [nodenv](https://github.com/nodenv/nodenv) to install the required version of Node.js specified in the `.node-version` file.
     ```sh
     nodenv install
     node --version
     ```

2. **Yarn**

   - Yarn must be installed using [Corepack](https://yarnpkg.com/getting-started/install), which is included by default in Node.js.
     ```sh
     corepack enable
     yarn --version
     ```

3. **Terraform**

   - Use [tfenv](https://github.com/tfutils/tfenv) to install the required version of Terraform specified in the `.terraform-version` file.
     ```sh
     tfenv install
     terraform version
     ```

4. **pre-commit**
   - Install `pre-commit` by following the [official documentation](https://pre-commit.com/).
     ```sh
     pre-commit install
     ```

#### Installing Dependencies

Run the following command to install all dependencies for the project:

```sh
yarn
```

To add a dependency to a specific workspace, use:

```sh
yarn workspace <workspace name> add <package name>
yarn workspace <workspace name> add -D <package name>
```

To add a shared development dependency for the monorepo, use:

```sh
yarn add -D <package name>
```

## Opening a Pull Request

1. **Fork the Repository**

   - Create a fork of this repository in your GitHub account.

2. **Create a Feature Branch**

   - Use a descriptive name for your branch, such as `feature/add-new-feature` or `bugfix/fix-issue`.

3. **Make Your Changes**

   - Ensure your changes adhere to the project's coding standards and guidelines.

4. **Test Your Changes**

   - Run the following scripts to verify your changes:
     ```sh
     yarn lint
     yarn test
     ```

5. **Commit Your Changes**

   - Write clear and concise commit messages.

6. **Push and Open a PR**
   - Push your branch to your fork and open a pull request against the `main` branch of this repository.

## Code Review Process

- All pull requests require at least one approval from a maintainer.
- Ensure your PR description includes the context and purpose of the changes.
- Address any feedback promptly to expedite the review process.

Thank you for contributing to DX!
