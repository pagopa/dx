# Cloud Login Action

This GitHub Action automatically detects and logs into the appropriate cloud provider (Azure or AWS) based on available environment variables.

## Usage

```yaml
steps:
  - name: Cloud Login
    uses: pagopa/dx/actions/csp-login@main
```

## How it works

The action checks for environment variables to determine which cloud provider to use:

1. **Azure**: If `ARM_CLIENT_ID`, `ARM_TENANT_ID`, and `ARM_SUBSCRIPTION_ID` are all set and non-empty
2. **AWS**: If `ROLE_ARN` is set and non-empty
3. **GitHub**: If `GH_APP_CLIENT_ID`, `GH_APP_KEY`, and `GH_APP_INSTALLATION_ID` are all set and non-empty

Any provider whose complete credential set is available will be logged in; providers without complete credentials are skipped.

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
- `GH_APP_INSTALLATION_ID`: GitHub App installation ID

When all three are set, the action creates a GitHub App token and exports it as `GITHUB_TOKEN`. Otherwise, the GitHub login is skipped and `GITHUB_TOKEN` is left unchanged.

These variables can be set at the workflow or job level, or in `env:` on the step that invokes this composite action. Prefer step-level `env:` to limit secret exposure.

## Scoped GitHub App tokens

The `export-github-token` input defaults to `"true"` to preserve existing callers.
Set it to `"false"` to leave the job's `GITHUB_TOKEN` unchanged, and pass the
`github-token` output only to the steps that need App permissions. The output is
empty when GitHub login is not configured. `CSP_LIST` is still exported in both modes.

```yaml
- name: Cloud Login
  id: cloud-login
  uses: pagopa/dx/actions/csp-login@main
  with:
    export-github-token: "false"
  env:
    GH_APP_CLIENT_ID: ${{ secrets.GH_APP_CLIENT_ID }}
    GH_APP_KEY: ${{ secrets.GH_APP_KEY }}
    GH_APP_INSTALLATION_ID: ${{ secrets.GH_APP_INSTALLATION_ID }}

- name: Terraform Plan
  env:
    GITHUB_TOKEN: ${{ steps.cloud-login.outputs.github-token }}
  run: terraform plan
```

`validate-v2.yaml` uses this mode: only its Terraform plan step receives the App
token, not the separate quality checks or artifact upload steps.

This is credential scoping, **not isolation from untrusted code**. Terraform plans
and their init dependencies still run repository code with cloud credentials and,
when configured, the App token. Quality checks in the environment job also retain
cloud access. Run this job only for trusted revisions, enforce GitHub environment
protection rules outside the PR-controlled workflow, and use least-privilege
planning identities and App permissions. Do not treat a successful fork gate or
moving credentials between steps as a sandbox.

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
        uses: pagopa/dx/actions/csp-login@main

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply -auto-approve
```
