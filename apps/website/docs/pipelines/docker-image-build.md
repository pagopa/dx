---
sidebar_position: 1
sidebar_label: Docker Image Build
---

# Docker Image Build

The [Docker Image Build](https://github.com/pagopa/dx/blob/main/.github/workflows/docker_image_build.yaml)
is a workflow that builds a OCI image and verifies that the Dockerfile is functional.


:::note
This workflow does not publish the OCI image to any registry
:::

## How It Works

The workflow performs the following steps:

1. Checks out the code from the repository.
2. Build the OCI image using the Dockerfile

## Usage

To use the **Docker Image Build** workflow, invoke it as a reusable workflow in your repository. Below is an example configuration:

##### With Dockerfile in the root of the repository and no custom parameters
```yaml
name: Docker Image Build

on:
  pull_request:
    paths:
      - Dockerfile

jobs:
  docker_image_build:
    uses: pagopa/dx/.github/workflows/docker_image_build.yaml@main
    name: Docker Image Build
    with:
      docker_image_name: "mytool"
      image_description: "My Tool is a tool that does something"
      image_authors: "PagoPA DX Team"
      build_platforms: "linux/amd64,linux/arm64"
```

##### With a custom Context and Dockerfile
```yaml
name: Docker Image Build
on:
  pull_request:
    paths:
      - Dockerfile.custom
      - custom-context/

jobs: 
  docker_image_build:
    uses: pagopa/dx/.github/workflows/docker_image_build.yaml@main
    name: Docker Image Build
    with:
      dockerfile_path: "Dockerfile.custom"
      context_path: "custom-context/"
      docker_image_name: "mytool"
      image_description: "My Tool is a tool that does something"
      image_authors: "PagoPA DX Team"
```
