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

#### Supported Platforms and Intel Mac Compatibility

**Breaking change: native development on Intel Macs (`macos-x64`) is no longer
supported by the repository's Mise-managed toolchain.**

pnpm 11.23.0 is now installed from prebuilt release binaries through Mise's
`aqua:pnpm/pnpm` backend instead of the `npm:pnpm` backend. This removes the
backend-migration warning and records platform-specific download URLs, SHA-256
checksums, and verified GitHub artifact attestations in `mise.lock`.

The pnpm release does not include a macOS x64 binary. The previous npm backend
installed the JavaScript package using Node.js and could run on Intel Macs;
the Aqua backend cannot provide that native macOS installation. No
`macos-x64` pnpm lock entry or automatic npm fallback is provided.

| Platform                                             | Repository's locked pnpm installation |
| ---------------------------------------------------- | ------------------------------------- |
| macOS ARM64 (Apple Silicon, running natively)        | Supported                             |
| macOS x64 (Intel Macs or an x64 shell under Rosetta) | Not supported                         |
| Linux x64 and ARM64, including musl variants         | Supported                             |
| Windows x64                                          | Supported                             |

This restriction applies to **native macOS**, not Intel processors in general.
Linux x64 CI runners and Linux development containers remain supported. On an
Intel Mac, use the repository's Linux development container rather than
bootstrapping the tools directly on macOS. On Apple Silicon, use an ARM64 shell
rather than running the toolchain under Rosetta.

#### Migrating an Existing Installation

After updating your checkout on a supported platform, replace the existing pnpm
installation with the binary from the migrated lockfile:

```bash
mise install --locked --force pnpm
pnpm --version
```

The expected pnpm version remains `11.23.0`; neither the repository's seven-day
tool release-age policy nor its npm dependency release-age policy is relaxed.
The old `.mise/locks/pnpm/11.23.0` npm dependency sidecars are replaced by the
platform metadata in `mise.lock`.

The repository lockfile has already been migrated; do not run
`mise backends switch pnpm` again. Once the lockfile uses the registry's current
backend, that command reports that there is no backend left to switch.

pnpm is explicitly declared in `mise.toml` because Mise's implicit
`package.json` integration selects the npm backend even after migrating the
lockfile. When upgrading pnpm, keep the version in `mise.toml` aligned with
`package.json`'s `packageManager` field, then run `mise lock pnpm` to regenerate
the platform locks.

## Bootstrap the Repository

From the repository root, install the required tools and dependencies:

```bash
mise install
pnpm install
```
