---
sidebar_label: "Development Containers"
sidebar_position: 6
---

# Development Containers

Development containers provide a consistent, reproducible development environment that works across different machines and operating systems. DX provides pre-configured dev containers to get you up and running quickly.

## Why Use Dev Containers?

### 🚀 **Instant Setup**
- Pre-configured with all necessary tools and dependencies
- No more "works on my machine" issues
- New team members can start coding immediately

### 🔧 **Consistency**
- Same environment for all developers
- Matches production environments closely
- Reduces debugging time caused by environment differences

### 🛡️ **Isolation**
- Keep different project dependencies separate
- Experiment safely without affecting your host system
- Easy cleanup and reset

## Quick Start

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running
- [VS Code](https://code.visualstudio.com/) with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### 2. Open in Container
1. Clone your repository
2. Open in VS Code
3. When prompted, click "Reopen in Container"
4. Wait for the container to build (first time only)

[**Detailed setup guide →**](./setting-up-devcontainer.md)

## Available Configurations

### 🌐 **Web Development**
Pre-configured for TypeScript, React, and Next.js projects:
- Node.js (version from `.node-version`)
- pnpm package manager
- TypeScript and ESLint
- Jest for testing

### 🏗️ **Infrastructure Development**
Set up for Terraform and Azure development:
- Terraform CLI
- Azure CLI
- Pre-commit hooks
- TFLint and tfsec

### 🐳 **Container Development**
Optimized for Docker and Kubernetes development:
- Docker CLI
- Kubernetes tools (kubectl, helm)
- Buildx for multi-platform builds

## Features

### 🔧 **Tool Integration**
- Pre-commit hooks automatically configured
- Linting and formatting on save
- Integrated terminal with all tools available
- Git configuration preserved

### 📊 **Performance**
- Volume mounts for fast file access
- Cached dependencies for faster rebuilds
- Optimized Docker images

### 🔌 **Extensions**
- Essential VS Code extensions pre-installed
- Language servers for TypeScript, Terraform
- Debugging configurations ready to use

## Getting Support

- **Issues?** Open an issue on the [DX repository](https://github.com/pagopa/dx/issues)
- **Questions?** Check the [VS Code Dev Containers documentation](https://code.visualstudio.com/docs/devcontainers/containers)

:::tip **Pro Tip**
Use the "Dev Containers: Rebuild Container" command in VS Code when you update your dev container configuration. This ensures all changes are applied correctly.
:::
