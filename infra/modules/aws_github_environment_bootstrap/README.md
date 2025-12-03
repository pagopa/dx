# DX - AWS GitHub Environment Bootstrap

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/aws-github-environment-bootstrap/aws?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Faws-github-environment-bootstrap%2Faws%2Flatest)

The AWS GitHub Environment Bootstrap module is designed for users who have just created a new GitHub repository and want to quickly focus on their goals without spending hours on setup. It is particularly useful for repositories that need to deploy to AWS infrastructure.

The module performs the following actions:

- Creates **AWS IAM Roles** for GitHub Actions to assume when deploying:
  1. Infrastructure resources (IaC) - both CI (read-only) and CD (admin) roles.
  2. Application resources - both CI (read-only) and CD (admin) roles.
- Sets up **OpenID Connect (OIDC)** integration between GitHub Actions and AWS.
- Creates **GitHub repository secrets** with the IAM role ARNs for workflows to use.
- Uses the **pagopa-dx AWS provider** for consistent resource naming conventions.
- Deploys a **GitHub self-hosted runner** on AWS CodeBuild for private CI/CD workflows.

## Quick Start

Use this module in your bootstrapper configuration to create all necessary GitHub-AWS integration resources:

```hcl
module "github_bootstrap" {
  source  = "pagopa-dx/aws-github-environment-bootstrap/aws"
  version = "~> 1.0"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    region          = "eu-south-1"
    domain          = "common"
    app_name        = "github"
    instance_number = "01"
  }

  repository = {
    owner = "pagopa"
    name  = "my-repository"
  }

  vpc = {
    id              = "vpc-0123456789abcdef0"
    private_subnets = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
  }

  github_private_runner = {
    personal_access_token = {
      ssm_parameter_name = "/github/pat"
    }
    secrets = {}
  }

  oidc_provider_arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"

  tags = {
    CostCenter  = "TS000"
    Environment = "Dev"
    Owner       = "DevEx"
    Source      = "Terraform"
  }
}
```

## Variables Reference

| Variable                | Description                                      | Required |
| ----------------------- | ------------------------------------------------ | :------: |
| `environment`           | Resource naming and location configuration       |    ✅    |
| `repository`            | GitHub repository details (owner, name)          |    ✅    |
| `vpc`                   | VPC configuration for self-hosted runner         |    ✅    |
| `github_private_runner` | Self-hosted runner configuration                 |    ✅    |
| `oidc_provider_arn`     | ARN of the GitHub OIDC provider                  |    ✅    |
| `tags`                  | Resource tags for cost allocation and management |    ✅    |

### Detailed Variable Explanations

#### `environment`

Defines resource naming conventions. All fields are mandatory except `domain`:

```hcl
environment = {
  prefix          = "dx"         # Organization/project prefix
  env_short       = "d"          # Environment: d=dev, u=uat, p=prod
  region          = "eu-south-1" # AWS region
  domain          = "common"     # Optional: domain for multi-domain setups
  app_name        = "github"     # Application identifier
  instance_number = "01"         # Instance number for uniqueness
}
```

#### `repository`

GitHub repository information for OIDC trust and secret creation:

```hcl
repository = {
  owner = "pagopa"           # GitHub organization (default: "pagopa")
  name  = "my-repository"    # Repository name
}
```

#### `vpc`

VPC configuration for the GitHub self-hosted runner on CodeBuild:

```hcl
vpc = {
  id              = "vpc-0123456789abcdef0"                    # VPC ID
  private_subnets = ["subnet-abc123", "subnet-def456"]         # Private subnet IDs for runner
}
```

#### `github_private_runner`

Configuration for the GitHub Actions self-hosted runner. You must provide **either** `codeconnection_arn` **or** `personal_access_token`, but not both:

```hcl
github_private_runner = {
  tier = "m"                    # Optional: Runner size (default: "m")

  # Option 1: Use AWS CodeConnection
  codeconnection_arn = "arn:aws:codestar-connections:..."

  # Option 2: Use Personal Access Token
  personal_access_token = {
    ssm_parameter_name = "/github/pat"  # SSM parameter containing the PAT
    # OR
    value = "ghp_..."                   # Direct PAT value (not recommended)
  }

  env_variables = {                     # Optional: Environment variables for runner
    NODE_VERSION = "20"
  }

  secrets = {                           # Secrets to inject into runner environment
    "NPM_TOKEN" = {
      ssm_parameter_name = "/npm/token"
    }
    "DATABASE_PASSWORD" = {
      secrets_manager_name = "prod/db/password"
    }
  }
}
```

#### `oidc_provider_arn`

The ARN of the GitHub OIDC provider in your AWS account. This is typically created once per AWS account and shared across repositories:

```hcl
oidc_provider_arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
```

#### `tags`

Standard AWS tags for resource management and cost allocation:

```hcl
tags = {
  CostCenter  = "TS000"
  Environment = "Dev"
  Owner       = "DevEx"
  Source      = "Terraform"
}
```

## Gotchas

### Ensure Necessary AWS Permissions

The AWS principal (user or IAM role) executing the `terraform apply` command must have sufficient permissions to:

- Create and manage IAM roles and policies
- Create OIDC identity providers
- Attach policies to roles

This typically requires `IAMFullAccess` or equivalent permissions.

### GitHub Actions Workflow Configuration

After deploying this module, configure your GitHub Actions workflows to assume the created IAM roles. Here's an example workflow configuration:

```yaml
name: Deploy Infrastructure
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: infra-cd
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.ROLE_ARN }}
          aws-region: eu-south-1

      - name: Deploy with Terraform
        run: |
          ...
```

## Accessing the Created IAM Role ARNs

The module outputs the IAM role ARNs that can be used in your workflows:

```hcl
output "infra_cd_role_arn" {
  value = module.aws_github_bootstrap.identities.infra.cd.id
}

output "app_cd_role_arn" {
  value = module.aws_github_bootstrap.identities.app.cd.id
}
```

## IAM Roles Created

The module creates four IAM roles:

1. **Infrastructure CI Role** (`infra-ci`): Read-only access for infrastructure testing and validation
2. **Infrastructure CD Role** (`infra-cd`): Full admin access for infrastructure deployment
3. **Application CI Role** (`app-ci`): Read-only access for application testing
4. **Application CD Role** (`app-cd`): Full admin access for application deployment

All roles are configured with OIDC trust relationships to allow GitHub Actions from your repository to assume them.

## Resource Naming Convention

This module uses the pagopa-dx AWS provider for consistent resource naming. Resource names follow the pattern:

```
{prefix}-{env_short}-{region_short}-{domain}-{name}-{resource_type}-{instance_number}
```

For example: `myapp-d-use1-core-infra-github-ci-iam-role-01`

## Integration with AWS Core Values Exporter

When using this module within the DX bootstrapper pattern, you can leverage the `aws_core_values_exporter` module to automatically retrieve infrastructure values from the core Terraform state. This simplifies configuration by eliminating hardcoded values.

### AWS Core Values Exporter Output Mapping

The following table shows how to map AWS Core Values Exporter outputs to this module's inputs:

| Bootstrap Module Input                                           | Core Values Exporter Output                       | Description                           |
| ---------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------- |
| `vpc.id`                                                         | `vpc_id`                                          | VPC ID for the self-hosted runner     |
| `vpc.private_subnets`                                            | `private_subnet_ids`                              | Private subnets for runner deployment |
| `oidc_provider_arn`                                              | `oidc_provider_arn`                               | GitHub OIDC provider ARN              |
| `github_private_runner.personal_access_token.ssm_parameter_name` | `github_personal_access_token_ssm_parameter_name` | SSM parameter with GitHub PAT         |

### Complete Integration Example

```hcl
module "core_values" {
  source  = "pagopa-dx/aws-core-values-exporter/aws"
  version = "~> 0.0"

  core_state = {
    bucket         = "my-terraform-state-bucket"
    key            = "core/terraform.tfstate"
    region         = "eu-south-1"
    dynamodb_table = "terraform-locks"
  }
}

module "bootstrap" {
  source  = "pagopa-dx/aws-github-environment-bootstrap/aws"
  version = "~> 1.0"

  environment = var.environment

  repository = {
    owner = "pagopa"
    name  = "my-repository"
  }

  vpc = {
    id              = module.core_values.vpc_id
    private_subnets = module.core_values.private_subnet_ids
  }

  github_private_runner = {
    personal_access_token = {
      ssm_parameter_name = module.core_values.github_personal_access_token_ssm_parameter_name
    }
    secrets = {}
  }

  oidc_provider_arn = module.core_values.oidc_provider_arn

  tags = var.tags
}
```

### Using Azure Storage Backend for Core State

If your core infrastructure state is stored in Azure Storage (hybrid cloud scenario):

```hcl
module "core_values" {
  source  = "pagopa-dx/aws-core-values-exporter/aws"
  version = "~> 0.0"

  core_state = {
    key                  = "core/terraform.tfstate"
    storage_account_name = "mystorageaccount"
    container_name       = "tfstate"
    resource_group_name  = "my-terraform-rg"
  }
}
```

## Extending the module for custom needs

The module provides the basic configuration adhering to DX and Technology standards. However, it can be extended according to new needs. The module exports all the IDs and names of the resources it creates, making it straightforward to add further resources.

### Adding Custom IAM Policies

If you need to attach additional policies to the created roles:

```hcl
resource "aws_iam_role_policy_attachment" "app_cd_custom" {
  role       = module.aws_github_bootstrap.identities.app.cd.name
  policy_arn = aws_iam_policy.custom_app_policy.arn
}

resource "aws_iam_policy" "custom_app_policy" {
  name = "custom-app-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::my-app-bucket/*"
      }
    ]
  })
}
```

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | >= 5.0, < 7.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.0 |
| <a name="requirement_github"></a> [github](#requirement\_github) | ~> 6.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_github_runner"></a> [github\_runner](#module\_github\_runner) | pagopa-dx/github-selfhosted-runner-on-codebuild/aws | ~> 1.0 |

## Resources

| Name | Type |
|------|------|
| [aws_iam_policy.ecr_push_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.ro_ecs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_role.app_cd](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role.app_ci](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role.infra_cd](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role.infra_ci](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role_policy_attachment.app_cd_admin_ecs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_role_policy_attachment.app_cd_admin_lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_role_policy_attachment.app_cd_ecr_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_role_policy_attachment.app_ci_ro_ecs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_role_policy_attachment.app_ci_ro_lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_role_policy_attachment.infra_cd_admin](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_role_policy_attachment.infra_ci_ro](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [github_actions_environment_secret.app_cd](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret) | resource |
| [github_actions_environment_secret.app_ci](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret) | resource |
| [github_actions_environment_secret.infra_cd](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret) | resource |
| [github_actions_environment_secret.infra_ci](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret) | resource |
| [github_actions_secret.repo_secrets](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_secret) | resource |
| [aws_iam_policy.admin_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy) | data source |
| [aws_iam_policy.ecs_admin_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy) | data source |
| [aws_iam_policy.lambda_admin_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy) | data source |
| [aws_iam_policy.lambda_read_only_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy) | data source |
| [aws_iam_policy.read_only_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy) | data source |
| [aws_iam_policy_document.ecr_push_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.ecs_read_only_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.github_assume_role_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and region short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    region          = string<br/>    domain          = string<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_github_private_runner"></a> [github\_private\_runner](#input\_github\_private\_runner) | Configuration for the GitHub self-hosted runner, including tier, code connection ARN, personal access token, environment variables, and secrets. Either codeconnection\_arn or personal\_access\_token must be set, but not both. | <pre>object({<br/>    tier               = optional(string, "m")<br/>    codeconnection_arn = optional(string, null)<br/>    personal_access_token = optional(object({<br/>      ssm_parameter_name = optional(string, null)<br/>      value              = optional(string, null)<br/>    }), null)<br/>    env_variables = optional(map(string), {})<br/>    secrets = map(object({<br/>      ssm_parameter_name   = optional(string, null)<br/>      secrets_manager_name = optional(string, null)<br/>    }))<br/>  })</pre> | n/a | yes |
| <a name="input_oidc_provider_arn"></a> [oidc\_provider\_arn](#input\_oidc\_provider\_arn) | The ARN of the OIDC provider for GitHub Actions. | `string` | n/a | yes |
| <a name="input_repository"></a> [repository](#input\_repository) | Details about the GitHub repository, including owner and name. | <pre>object({<br/>    owner = optional(string, "pagopa")<br/>    name  = string<br/>  })</pre> | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(string)` | n/a | yes |
| <a name="input_vpc"></a> [vpc](#input\_vpc) | The VPC used to deploy the resources | <pre>object({<br/>    id              = string<br/>    private_subnets = list(string)<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_github_private_runner"></a> [github\_private\_runner](#output\_github\_private\_runner) | Details of the GitHub private runner, including security group and IAM role. |
| <a name="output_identities"></a> [identities](#output\_identities) | Details of the IAM roles for app, infra, including ARNs and names. |
| <a name="output_repository"></a> [repository](#output\_repository) | Details of the GitHub repository. |
<!-- END_TF_DOCS -->
