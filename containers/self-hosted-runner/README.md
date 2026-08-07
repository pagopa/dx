# DX - Self-Hosted GitHub Runner

This is a Dockerfile for building a self-hosted GitHub runner provided by DX. The runner is designed to execute GitHub Actions workflows on your infrastructure, offering flexibility and control over the execution environment.

## Features

- **Up‑to‑date GitHub runner** – based on the official `ghcr.io/actions/runner:<version>` image.
- **mise**: Installs repository-specific development tools declared in
  `mise.toml`.
- **Pre-installed tool baseline** – provides AWS CLI, Azure CLI, uv, and zip
  through the image's `mise.toml`; repository configurations can extend or
  override it. The mise shims expose baseline tools directly on `PATH`.
  Language runtimes and Terraform remain managed by their official workflow
  setup actions.
- **Setup action runtime policy** – disables Go, Node.js, pnpm, Python, and
  Terraform in mise by default, reserving those runtimes for workflow setup
  actions.
- **Scoped writable tool directories** – allows arbitrary `mise` backends and
  installed tools to use the standard XDG locations under the runner user's
  home.
- **Flexible authentication** – accepts a registration token, a GitHub PAT, or
  GitHub App credentials.
- **Graceful cleanup** – the runner unregisters itself from GitHub on container shutdown, avoiding “ghost” runners.

## Entrypoint

The Docker image includes an entrypoint script (`entrypoint.sh`) that is responsible for initializing and configuring the self-hosted runner. This script ensures the runner is properly registered with your GitHub repository or organization and starts listening for workflow jobs. Make sure to provide the necessary environment variables:

### Environment variables

| Variable                     | Required | Default            | Description                                                                                                                                                              |
| ---------------------------- | -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `REPO_URL`                   | **Yes**  | –                  | Full URL of the repo where the runner will register (e.g. `https://github.com/[REPOSITORY_OWNER]/[REPOSITORY_NAME]`). `GITHUB_REPOSITORY` is accepted as a legacy alias. |
| `RUNNER_TOKEN`               | Cond.\*  | –                  | 60-minute registration token obtained via the GitHub REST API. `GITHUB_TOKEN` is accepted as a legacy alias.                                                             |
| `GITHUB_PAT`                 | Cond.\*  | –                  | A GitHub PAT with `admin:org` or `repo` scope used to fetch `RUNNER_TOKEN` automatically.                                                                                |
| `GITHUB_APP_ID`              | Cond.\*  | –                  | ID of the GitHub App used to obtain an installation access token.                                                                                                        |
| `GITHUB_APP_KEY`             | Cond.\*  | –                  | PEM private key of the GitHub App.                                                                                                                                       |
| `GITHUB_APP_INSTALLATION_ID` | Cond.\*  | –                  | Installation ID of the GitHub App for the target repository.                                                                                                             |
| `REGISTRATION_TOKEN_API_URL` | Cond.\*  | –                  | API endpoint to request a token (e.g. `"https://api.github.com/repos/[REPOSITORY_OWNER]/[REPOSITORY_NAME]/actions/runners/registration-token"`).                         |
| `RUNNER_NAME`                | No       | Container hostname | Friendly name shown in the GitHub UI.                                                                                                                                    |
| `WORK_DIR`                   | No       | `_work`            | Directory where each job’s workspace is placed. Must be **writeable**.                                                                                                   |
| `LABELS`                     | No       | None               | Comma‑separated list of runner labels.                                                                                                                                   |

\* **Cond.** – Provide one authentication method: `RUNNER_TOKEN`;
`GITHUB_PAT` with `REGISTRATION_TOKEN_API_URL`; or all three GitHub App
variables with `REGISTRATION_TOKEN_API_URL`.

## Writable tool directories

Mise backends do not share a fixed set of tool-specific paths. The runner user
therefore owns the standard XDG roots used by repository tools without changing
ownership outside those locations:

| Path             | Used by                            |
| ---------------- | ---------------------------------- |
| `~/.local/bin`   | User-local executable shims        |
| `~/.local/share` | Tool installations and shared data |
| `~/.local/state` | Tool state                         |
| `~/.config`      | Tool configuration                 |
| `~/.cache`       | Downloads and cached metadata      |

## Mise runtime policy

The image sets:

```text
MISE_DISABLE_TOOLS=go,node,pnpm,python,terraform
```

This prevents repository `mise.toml` files from duplicating or shadowing the
runtimes reserved for workflow setup actions. The policy is part of the image
so every workflow using the DX runner receives the same safe default.

## Testing

The image includes basic tests to verify the installation of key tools:

- mise (`mise --version`)
- AWS CLI (`aws --version`)
- Azure CLI (`az version`)
- uv (`uv --version`)
- zip (`zip -v`)
- GitHub Actions Node.js runtime (`externals/node24/bin/node --version`)
