# DX - Self-Hosted GitHub Runner

This is a Dockerfile for building a self-hosted GitHub runner provided by DX. The runner is designed to execute GitHub Actions workflows on your infrastructure, offering flexibility and control over the execution environment.

## Features

- **Base Runner**: Uses the official GitHub Actions runner image as the base.
- **Node.js**: Installs Node.js (v20.12.2) and enables Corepack for package management.
- **Azure CLI**: Includes the Azure CLI for managing Azure resources.
- **AWS CLI**: Includes the AWS CLI for managing AWS resources.

## Entrypoint

The image includes an entrypoint script (`entrypoint.sh`) that initializes the runner. Ensure the script is properly configured for your environment.

## Testing

The image includes basic tests to verify the installation of key tools:

- Node.js (`node --version`)
- npm (`npm --version`)
- Azure CLI (`az --version`)
- AWS CLI (`aws --version`)
