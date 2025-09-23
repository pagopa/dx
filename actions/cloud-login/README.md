# Cloud Login Action

This GitHub Action automatically detects and logs into the appropriate cloud provider (Azure or AWS) based on available environment variables.

## Usage

```yaml
steps:
  - name: Cloud Login
    uses: pagopa/dx/.github/actions/cloud-login@main
```

## How it works

The action checks for environment variables to determine which cloud provider to use:

1. **Azure**: If `ARM_CLIENT_ID`, `ARM_TENANT_ID`, and `ARM_SUBSCRIPTION_ID` are all set and non-empty
2. **AWS**: If `ROLE_ARN` is set and non-empty

If both sets of variables are available, both login steps will execute. If neither is available, no login will occur.

## Environment Variables

### For Azure

- `ARM_CLIENT_ID`: Azure client ID (required for Azure)
- `ARM_TENANT_ID`: Azure tenant ID (required for Azure)
- `ARM_SUBSCRIPTION_ID`: Azure subscription ID (required for Azure)

### For AWS

- `ROLE_ARN`: AWS IAM role ARN to assume (required for AWS)
- `AWS_REGION`: AWS region (optional, defaults to `eu-south-1`)

## Example Usage

### Terraform workflows supporting both clouds

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: prod-ci
    permissions:
      id-token: write
      contents: read
    env:
      # Azure variables
      ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
      ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
      ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
      # AWS variables
      ROLE_ARN: ${{ secrets.ROLE_ARN }}
      AWS_REGION: ${{ secrets.AWS_REGION }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Cloud Login
        uses: pagopa/dx/.github/actions/cloud-login@main

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply -auto-approve
```

## Related Actions

- [azure-login](../azure-login/): Direct Azure authentication
- [aws-login](../aws-login/): Direct AWS authentication
