# Terraform Plan Upload Action

This action encrypts a Terraform plan file and uploads it as a GitHub Actions artifact.

## Usage

```yaml
- name: Upload Terraform Plan
  uses: pagopa/dx/actions/terraform-plan-upload@main
  env:
    ARTIFACT_ENC_KEY: ${{ secrets.ARTIFACT_ENC_KEY }}
  with:
    plan-file: tfplan-prod-${{ github.sha }}
    working-directory: infra/resources/prod
    artifact-name: terraform-plan
    retention-days: 1
```

## Inputs

| Input               | Description                                           | Required | Default |
| ------------------- | ----------------------------------------------------- | -------- | ------- |
| `plan-file`         | Name of the Terraform plan file to encrypt and upload | Yes      | -       |
| `working-directory` | Working directory containing the plan file            | Yes      | -       |
| `artifact-name`     | Name for the uploaded artifact                        | Yes      | -       |
| `retention-days`    | Number of days to retain the artifact                 | No       | `1`     |

## Environment Variables

| Variable           | Description                              | Required |
| ------------------ | ---------------------------------------- | -------- |
| `ARTIFACT_ENC_KEY` | Secret key used to encrypt the plan file | Yes      |

## Notes

- The plan file is encrypted using AES-256-CBC with PBKDF2
- The original unencrypted plan file is removed after encryption
- The encrypted file has `.enc` extension appended
