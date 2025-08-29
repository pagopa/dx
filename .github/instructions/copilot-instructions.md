# DevEx (DX) Repository

This mono-repository contains a set of tools aimed to help developers. These tools are strongly-opinionated to reduce developers' cognitive load as each decision has been taken in advance.

## Repository Structure

- `/.github/` and `/actions/`: contains workflow templates and GitHub Actions.
- `/apps/` contains two applications: the first is a static website (`/apps/website/`) with the documentation of the tooling provided within this repository; the latter (`/apps/cli/`) is a CLI we are developing to allow developers to generate code.
- `/containers/` contains a Docker image useful to run self-hosted GitHub runners.
- `/infra/` provides the cloud environment setup for this repo. This environment is mainly used as playground for testing new things. Instead, the subfolder `modules` (`/infra/modules`) provides a set of Terraform modules to developers to facilitate their dealing with the complexity of cloud providers. These modules are pushed to Terraform registry under the org `pagopa-dx`.
- `/packages/` provides NPM packages to solve specific development issues like monitoring and eslint configuration.
- `/providers/` has a custom Terraform provider we have developed. This provider exposes custom Terraform functions

The repository has a devcontainer to speed up the environment setup.

`pnpm` is used as a package manager.
`changeset` is used to version packages.
`turborepo` is used to manage the mono-repository.

In `CONTRIBUTING.md` file there are important information on how to contribute to the project (setup, build, format, etc.).

## Code Standards

### Required Before Each Commit

- Run `pre-commit run -a` when committing changes containing Terraform files
- Run `pnpm changeset` when updating a package (a subfolder containing a `package.json` file)
