# Docker Build and Push Action

GitHub Action for building and pushing Docker images to multiple container registries: **GitHub Container Registry (GHCR)** and **AWS Elastic Container Registry (ECR)**.

## Features

- 🐳 Docker image builds with multi-platform support
- 📦 Push to two different registries: GHCR and AWS ECR
- 🏷️ Automatic tagging based on semantic conventions
- 🔐 Automatic artifact attestation (GHCR only)
- ⚡ Optimized cache for fast builds
- 🎯 Support for custom build arguments
- 📝 Complete OCI metadata

## Inputs

| Input                      | Required | Default                    | Description                                        |
| -------------------------- | -------- | -------------------------- | -------------------------------------------------- |
| `dockerfile_path`          | No       | `./Dockerfile`             | Path to the Dockerfile                             |
| `dockerfile_context`       | No       | `.`                        | Docker build context path                          |
| `docker_image_name`        | No       | `${{ github.repository }}` | Docker image name                                  |
| `docker_image_description` | **Yes**  | -                          | Image description (used in OCI labels)             |
| `docker_image_authors`     | No       | ``                         | Image authors                                      |
| `build_args`               | No       | -                          | Build arguments in `KEY=VALUE` format (multiline)  |
| `build_platforms`          | **Yes**  | `linux/amd64`              | Target platforms (e.g., `linux/amd64,linux/arm64`) |
| `registry`                 | No       | `ghcr`                     | Registry type: `ghcr` or `ecr`                     |
| `push_to_registry`         | No       | `true`                     | If `false`, only builds without pushing            |
| `additional_tag`           | No       | ``                         | Optional tag to apply to the image                 |

## Outputs

| Output         | Description                                |
| -------------- | ------------------------------------------ |
| `image_tags`   | Complete list of tags applied to the image |
| `registry_uri` | Full URI of the registry used              |
| `image_uri`    | The full image URI including tag           |

## Tagging Strategy

The action automatically applies different tags:

- `latest` - only on the default branch
- `<version>` - for semantic tags (e.g., `v1.2.3` → `1.2.3`)
- `<major>.<minor>` - for semantic tags (e.g., `v1.2.3` → `1.2`)
- `<major>` - for semantic tags excluding v0.x (e.g., `v1.2.3` → `1`)
- `<branch-name>` - branch name for branch pushes
- `sha-<commit>` - commit SHA (first 7 characters)
- `<custom-tag>` - custom tag via `additional_tag` input (optional)

> **Note**: ECR uses explicit tags for better control. All three tags can be applied simultaneously for maximum traceability. The commit SHA tag uses the full commit SHA, not a truncated or prefixed version.

## Usage Examples

### GitHub Container Registry (Default)

```yaml
name: Build and Push to GHCR

on:
  push:
    branches:
      - main
    tags:
      - "v*"

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Build and Push
        uses: pagopa/dx/actions/docker-build-push@main
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          docker_image_name: my-app
          docker_image_description: "My Application"
          dockerfile_path: ./Dockerfile
          dockerfile_context: .
```

### AWS Elastic Container Registry (ECR)

```yaml
name: Build and Push to ECR with Version Tag

on:
  push:
    tags:
      - "v*"

jobs:
  build:
    runs-on: ubuntu-latest
    environment: app-...-cd
    env:
      AWS_REGION: eu-central-1
      ROLE_ARN: ${{ secrets.ROLE_ARN }}
    permissions:
      contents: read
      packages: read
      id-token: write
      attestations: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Cloud Login
        uses: pagopa/dx/actions/csp-login@main

      - name: Extract version from tag
        id: version
        run: echo "tag=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Build and Push to ECR
        uses: pagopa/dx/actions/docker-build-push@main
        with:
          registry: ecr
          additional_tag: ${{ steps.version.outputs.tag }}
          docker_image_name: my-app
          docker_image_description: "My Application"
          dockerfile_path: ./Dockerfile
          dockerfile_context: .
```

> **Note**: For ECR, the `aws-actions/amazon-ecr-login` action is executed automatically. You only need to configure AWS credentials beforehand.
> **Tip**: Use `ecr_tag_name` to apply version tags or environment identifiers (e.g., `v1.2.3`, `stable`, `prod`).

## Registry Prerequisites

### GHCR Prerequisites

- Workflow permissions: `packages: write`, `attestations: write`, `id-token: write`, `contents: read`
- Environment variable: `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`

### ECR Prerequisites

- ECR repository must exist before pushing
- AWS credentials configured (recommended: `pagopa/dx/actions/csp-login@main`)
- Required IAM permissions:
  - `ecr:CompleteLayerUpload`
  - `ecr:GetAuthorizationToken`
  - `ecr:UploadLayerPart`
  - `ecr:CompleteLayerUpload`
  - `ecr:InitiateLayerUpload`
  - `ecr:BatchCheckLayerAvailability`
  - `ecr:BatchGetImage`
  - `ecr:GetDownloadUrlForLayer`
  - `ecr:PutImage`

## OCI Labels

The action automatically applies these OCI labels:

- `org.opencontainers.image.title` - Image name
- `org.opencontainers.image.description` - Description
- `org.opencontainers.image.authors` - Authors
- `org.opencontainers.image.url` - Repository URL
- `org.opencontainers.image.source` - GitHub source URL
- `org.opencontainers.image.version` - Version (from tag)
- `org.opencontainers.image.created` - Creation timestamp
- `org.opencontainers.image.revision` - Commit SHA

## Cache

The action uses GitHub Actions cache to speed up subsequent builds:

- `cache-from: type=gha` - Read from cache
- `cache-to: type=gha,mode=min` - Write only essential layers
