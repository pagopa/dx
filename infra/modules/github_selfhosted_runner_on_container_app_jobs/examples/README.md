# GitHub SelfHosted Runner on Azure Container App Job Example

This directory contains examples of how to use the GitHub SelfHosted Runner on Azure Container App Job module.

## Basic Example

The [basic example](./basic) demonstrates a simple implementation of the GitHub SelfHosted Runner on Azure Container App Job module.

### Usage

```bash
cd basic
terraform init
terraform plan
terraform apply
```

This will create:

- A Container App Job
- A Key Vault Access Policy or IAM role, depending on KeyVault configuration
