# Cloud Login Action

This GitHub Action automatically detects and logs into the appropriate cloud provider (Azure or AWS) based on available environment variables.

## Usage

```yaml
steps:
  - name: Cloud Login
    id: cloud-login
    uses: pagopa/dx/actions/csp-login@main
```

## How it works

The action checks for environment variables to determine which cloud provider to use:

1. **Azure**: If `ARM_CLIENT_ID`, `ARM_TENANT_ID`, and `ARM_SUBSCRIPTION_ID` are all set and non-empty
2. **AWS**: If `ROLE_ARN` is set and non-empty
3. **GitHub**: If `GH_APP_CLIENT_ID`, `GH_APP_KEY`, and
   `GH_APP_INSTALLATION_ID` are all set and non-empty

When multiple credential sets are available, all matching login steps execute.
If neither Azure nor AWS credentials are available, the action fails.

## Environment Variables

### For Azure

- `ARM_CLIENT_ID`: Azure client ID (required for Azure)
- `ARM_TENANT_ID`: Azure tenant ID (required for Azure)
- `ARM_SUBSCRIPTION_ID`: Azure subscription ID (required for Azure)

### For AWS

- `ROLE_ARN`: AWS IAM role ARN to assume (required for AWS)
- `AWS_REGION`: AWS region (optional, defaults to `eu-south-1`)

### For GitHub

- `GH_APP_CLIENT_ID`: GitHub App client ID
- `GH_APP_KEY`: GitHub App private key
- `GH_APP_INSTALLATION_ID`: Expected GitHub App installation ID

## Inputs

- `create_github_modules_token`: when set to `"true"`, creates a separate
  read-only token from the GitHub App installation in `pagopa-dx`.

## Outputs

- `github_app_token`: GitHub App installation token. The output is empty when
  GitHub login is not configured and is masked in workflow logs.
- `github_modules_token`: read-only installation token for repositories owned
  by `pagopa-dx`. It is created only when `create_github_modules_token` is
  `true` and is masked in workflow logs.

The tokens are not exported as a job-wide `GITHUB_TOKEN`. Pass each output
explicitly only to steps that require it:

```yaml
- name: Cloud Login
  id: cloud-login
  uses: pagopa/dx/actions/csp-login@main

- name: Run GitHub command
  env:
    GITHUB_TOKEN: ${{ steps.cloud-login.outputs.github_app_token }}
  run: gh api user
```

The automatic workflow `GITHUB_TOKEN` is scoped to the repository that started
the workflow, so it cannot authenticate Git downloads from the separate
`pagopa-dx` organization. Terraform workflows that download DX Registry modules
must request the dedicated token:

```yaml
- name: Cloud Login
  id: cloud-login
  uses: pagopa/dx/actions/csp-login@main
  env:
    GH_APP_CLIENT_ID: ${{ secrets.GH_APP_CLIENT_ID }}
    GH_APP_KEY: ${{ secrets.GH_APP_KEY }}
    GH_APP_INSTALLATION_ID: ${{ secrets.GH_APP_INSTALLATION_ID }}
  with:
    create_github_modules_token: "true"
```

The GitHub App identified by `GH_APP_CLIENT_ID` and `GH_APP_KEY` must be
installed in `pagopa-dx` with read access to the module repositories.

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
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0

      - name: Cloud Login
        id: cloud-login
        uses: pagopa/dx/actions/csp-login@main
        env:
          GH_APP_CLIENT_ID: ${{ secrets.GH_APP_CLIENT_ID }}
          GH_APP_KEY: ${{ secrets.GH_APP_KEY }}
          GH_APP_INSTALLATION_ID: ${{ secrets.GH_APP_INSTALLATION_ID }}
        with:
          create_github_modules_token: "true"

      - name: Terraform Init
        uses: pagopa/dx/.github/actions/run-with-github-auth@main
        with:
          command: terraform init
          github_modules_token: ${{ steps.cloud-login.outputs.github_modules_token }}
          github_token: ${{ secrets.GITHUB_TOKEN }}

      - name: Terraform Apply
        run: terraform apply -auto-approve
```

## Related Actions

- [azure-login](../azure-login/): Direct Azure authentication
- [aws-login](../aws-login/): Direct AWS authentication
