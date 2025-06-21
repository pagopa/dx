# DX - Self-Hosted GitHub Runner

This is a Dockerfile for building a self-hosted GitHub runner provided by DX. The runner is designed to execute GitHub Actions workflows on your infrastructure, offering flexibility and control over the execution environment.

## Features

- **Up‑to‑date GitHub runner** – based on the official `ghcr.io/actions/runner:<version>` image.
- **Node.js**: Installs Node.js (v20.12.2) and enables Corepack for package management.
- **Azure CLI**: Includes the Azure CLI for managing Azure resources.
- **AWS CLI**: Includes the AWS CLI for managing AWS resources.
- **Graceful cleanup** – the runner unregisters itself from GitHub on container shutdown, avoiding “ghost” runners.

## Entrypoint

The Docker image includes an entrypoint script (`entrypoint.sh`) that is responsible for initializing and configuring the self-hosted runner. This script ensures the runner is properly registered with your GitHub repository or organization and starts listening for workflow jobs. Make sure to provide the necessary environment variables:

### Environment variables

| Variable                     | Required | Default            | Description                                                                                                                                                                           |
| ---------------------------- | -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REPO_URL`                   | **Yes**  | –                  | Full URL of the repo where the runner will register (e.g. `https://github.com/[REPOSITORY_OWNER]/[REPOSITORY_NAME]`).                                                                 |
| `RUNNER_TOKEN`               | Cond.\*  | –                  | 60‑minute registration token obtained via the GitHub REST API. Required unless `GITHUB_PAT` **and** `REGISTRATION_TOKEN_API_URL` are provided (the entrypoint can fetch one for you). |
| `GITHUB_PAT`                 | Cond.\*  | –                  | A GitHub PAT with `admin:org` or `repo` scope used to fetch `RUNNER_TOKEN` automatically.                                                                                             |
| `REGISTRATION_TOKEN_API_URL` | Cond.\*  | –                  | API endpoint to request a token (e.g. `"https://api.github.com/repos/[REPOSITORY_OWNER]/[REPOSITORY_NAME]/actions/runners/registration-token"`).                                      |
| `RUNNER_NAME`                | No       | Container hostname | Friendly name shown in the GitHub UI.                                                                                                                                                 |
| `WORK_DIR`                   | No       | `/_work`           | Directory where each job’s workspace is placed. Must be **writeable**.                                                                                                                |
| `LABELS`                     | No       | None               | Comma‑separated list of runner labels.                                                                                                                                                |

\* **Cond.** – Required only if `RUNNER_TOKEN` is **not** provided.

## Testing

The image includes basic tests to verify the installation of key tools:

- Node.js (`node --version`)
- npm (`npm --version`)
- Azure CLI (`az --version`)
- AWS CLI (`aws --version`)
