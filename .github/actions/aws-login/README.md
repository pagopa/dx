# AWS Login Action

This GitHub Action logs into AWS using OpenID Connect (OIDC) authentication.

## Usage

```yaml
steps:
  - name: AWS Login
    uses: pagopa/dx/.github/actions/aws-login@adapt-terraform-cicd-to-aws
```

## Environment Variables

This action requires the following environment variables to be set:

- `ROLE_ARN`: AWS IAM role ARN to assume (required)
- `AWS_REGION`: AWS region (optional, defaults to `eu-south-1`)

## Example

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: prod
    permissions:
      id-token: write
      contents: read
    env:
      ROLE_ARN: ${{ secrets.ROLE_ARN }}
      AWS_REGION: "eu-south-1"
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: AWS Login
        uses: pagopa/dx/.github/actions/aws-login@adapt-terraform-cicd-to-aws

      - name: Deploy with Terraform
        run: terraform apply -auto-approve
```

## Prerequisites

1. AWS OIDC identity provider configured in the target AWS account
2. IAM role with appropriate trust policy for GitHub Actions
3. GitHub environment/repository secrets configured with the role ARN

## Related Actions

- [azure-login](../azure-login/): For Azure authentication
- [cloud-login](../cloud-login/): For automatic cloud provider detection
