# DX

DevEx repository for shared tools and pipelines.

- [DX](#dx)
  - [GitHub Action Templates](#github-action-templates)
    - [infra_plan.yaml](#infra_planyaml)
      - [What it does](#what-it-does)
      - [Example](#example)
      - [Requirements](#requirements)
    - [infra\_apply.yaml](#infra_applyyaml)
      - [What it does](#what-it-does-1)
      - [Requirements](#requirements-1)

## GitHub Action Templates

### infra_plan.yaml

As a `workflow_call`, this action should be invoked and used as template by other GitHub Actions to validate Pull Requests containing Terraform code changes. It provides all job steps that must be run to validate a Terraform configuration, and includes the job properties configuration as well.

#### What it does

This template is useful to validate Pull Requests with Terraform code changes. It is also suggested to run the workflow everytime the PR code changes only if the PR status is ready (no drafts).

The workflow template authenticates with Azure and performs a `terraform plan` command to validate the changes.

Ultimately, it prints out a comment in the PR view with the plan output. In case of multiple executions, it updates the previous comment with the latest changes.

It supports optional input with the agent it should run on (GitHub managed or not), or custom environment variables.

#### Example

An example of its use can be found [here](https://github.com/pagopa/dx-typescript/blob/main/.github/workflows/pr_infra.yaml).
It is recommended to stick to the same naming conventions shown in the example.

#### Requirements

This workflow template leverages on managed identities to authenticate with Azure. Managed identities can be easily created through the module `azure_federated_identity_with_github` available in this repository.

Terraform definitions are intended to work for an environment in a specific region. Each pair environment/region is a Terraform project on its own and they will be located in the `<env>/<region>` subfolder. Every automation will expect resources to be in such folders.

### infra_apply.yaml

As a `workflow_call`, this action should be invoked and used as template by other GitHub Actions to deploy infrastructure changes after a PR have been merged. It provides all job steps that must be run to apply a Terraform configuration, and includes the job properties configuration as well.

#### What it does

This template is useful to deploy Terraform code changes. It is also suggested to run the workflow everytime a PR is merged in the `main` branch.

The workflow authenticates with Azure and perform a `terraform plan` to inform the user about the next changes. If there aren't any unexpected change, the user can approve the second step of the workflow and apply them.

**Note**: the deployment approval step must be configured at GitHub repositiory level, by changing settings of the `<env>-cd` environment. Otherwise, the deployment is done automatically.

This workflow is set to be run once per time, abolishing concurrent runs.

#### Requirements

This workflow template leverages on managed identities to authenticate with Azure. Managed identities can be easily created through the module `azure_federated_identity_with_github` available in this repository.

Terraform definitions are intended to work for an environment in a specific region. Each pair environment/region is a Terraform project on its own and they will be located in the `<env>/<region>` subfolder. Every automation will expect resources to be in such folders.

## NPM packages

This project requires specific versions of the following tools. To make sure your development setup matches with production follow the recommended installation methods.

- **Node.js**

  Use [nodenv](https://github.com/nodenv/nodenv) to install the [required version](.node-version) of `Node.js`.

  ```sh
  nodenv install
  node --version
  ```

- **Yarn**

  Yarn must be installed using [Corepack](https://yarnpkg.com/getting-started/install), included by default in `Node.js`.

  ```sh
  corepack enable
  yarn --version
  ```

- **Terraform**

  Use [tfenv](https://github.com/tfutils/tfenv) to install the [required version](.terraform-version) of `terraform`.

  ```sh
  tfenv install
  terraform version
  ```

- **pre-commit**

  [Follow the official documentation](https://pre-commit.com/) to install `pre-commit` in your machine.

  ```sh
  pre-commit install
  ```

## Tasks

Tasks are defined in the `turbo.json` and `package.json` files. To execute a task, just run the command at the project root:

```sh
yarn <cmd>
```

`Turborepo` will execute the task for all the workspaces that declare the same command in their `package.json` file; it also applies caching policies to the command according to the rules defined in `turbo.json`.

To define a new task:

- add the definition to `turbo.json` under `pipeline`;
- add a script with the same name in `package.json` as `turbo <cmd name>`.

To see the defined task run `yarn run`

## Dependencies

> [!IMPORTANT]  
> This project uses Yarn Plug'n'Play as installation strategy for dependencies. [Check out](https://yarnpkg.com/features/pnp) the official Yarn documentation to lean about pnp and its difference from the classic `node_modules` approach.

```sh
# install all dependencies for the project
yarn

# install a dependency to a workspace
#   (workspace name is the name in the package.json file)
yarn workspace <workspace name> add <package name>
yarn workspace <workspace name> add -D <package name>

# install a dependency for the monorepo
#   (ideally a shared dev dependency)
yarn add -D <package name>
```

To add a dependency to a local workspace, manually edit the target workspace's `package.json` file adding the dependency as

```json
"dependencies": {
    "my-dependency-workspace": "workspace:*"
}
```

### Yarn SDKS (.yarn/sdks)

Smart IDEs (such as VSCode or IntelliJ) require special configuration for TypeScript to work when using Plug'n'Play installs. That configuration is generated automatically by `yarn` (via `yarn dlx @yarnpkg/sdks vscode vim [other-editor...]`) and commited to `.yarn/sdks`.
