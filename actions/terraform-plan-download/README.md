# Terraform Plan Download Action

This action downloads and decrypts a Terraform plan artifact that was encrypted by the `terraform-plan-upload` action.

## Usage

```yaml
- name: Download Terraform Plan
  uses: pagopa/dx/actions/terraform-plan-download@main
  env:
    ARTIFACT_ENC_KEY: ${{ secrets.ARTIFACT_ENC_KEY }}
  with:
    plan-file: tfplan-prod-${{ github.sha }}
    working-directory: infra/resources/prod
    artifact-name: terraform-plan
```

## Inputs

| Input               | Description                                        | Required |
| ------------------- | -------------------------------------------------- | -------- |
| `plan-file`         | Name of the Terraform plan file to decrypt         | Yes      |
| `working-directory` | Working directory where the plan will be decrypted | Yes      |
| `artifact-name`     | Name of the artifact to download                   | Yes      |

## Environment Variables

| Variable           | Description                              | Required |
| ------------------ | ---------------------------------------- | -------- |
| `ARTIFACT_ENC_KEY` | Secret key used to decrypt the plan file | Yes      |

## Notes

- The encrypted file must have `.enc` extension
- The decrypted file is saved without the `.enc` extension
- The encrypted file is removed after successful decryption
- This action must use the same `ARTIFACT_ENC_KEY` that was used for encryption
