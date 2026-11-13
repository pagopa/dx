---
"@pagopa/dx-cli": minor
docs: patch
---

Ship a `copilot-setup-steps.yml` workflow in the monorepo scaffold, so the GitHub Copilot coding agent can install the workspace dependencies on a freshly generated repository without manual steps. The workflow installs the mise toolchain, authenticates pnpm to GitHub Packages through the `setup-npm-registry` action and installs the dependencies.

GitHub Packages asks for a token even for the public packages it serves, and the scaffold depends only on public ones, so the workflow authenticates with the repository's own workflow token and needs no secret. That also makes it independent of where Copilot takes its credentials from: the workflow token is available in every run, including the one Copilot executes before the agent starts. The workflow keeps the private case reachable by pointing the `token` input at a secret and granting the repository under `Manage Actions access` in the package settings. The generated `README.md` and `AGENTS.md` document the workflow and the local setup that writes a token to the git-ignored `.npmrc`.
