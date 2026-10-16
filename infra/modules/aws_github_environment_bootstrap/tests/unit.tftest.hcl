variables {
  environment = {
    prefix          = "dx"
    env_short       = "p"
    region          = "eu-south-1"
    domain          = "test"
    app_name        = "github"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Technology and Services"
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/aws_github_environment_bootstrap/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "AWS GitHub environment bootstrap unit tests"
  }

  repository = {
    name = "dx-test-monorepo-starter-pack"
  }

  vpc = {
    id              = "vpc-0123456789abcdef0"
    private_subnets = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
  }

  github_private_runner = {
    personal_access_token = {
      value = "ghp_test-token"
    }
    secrets = {}
  }

  oidc_provider_arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
}

mock_provider "aws" {}
mock_provider "github" {
  mock_data "github_organization" {
    defaults = {
      id = "57742367"
    }
  }
  mock_data "github_repository" {
    defaults = {
      repo_id = 1373623344
    }
  }
}

override_data {
  target = data.aws_iam_policy_document.github_assume_role_policy
  values = {
    json = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect   = "Allow"
        Action   = "sts:AssumeRoleWithWebIdentity"
        Resource = "*"
      }]
    })
  }
}

override_data {
  target = data.aws_iam_policy_document.ecs_read_only_access
  values = {
    json = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect   = "Allow"
        Action   = "ecs:Describe*"
        Resource = "*"
      }]
    })
  }
}

override_data {
  target = data.aws_iam_policy_document.ecr_push_access
  values = {
    json = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect   = "Allow"
        Action   = "ecr:PutImage"
        Resource = "*"
      }]
    })
  }
}

override_data {
  target = data.aws_iam_policy.admin_access
  values = {
    arn = "arn:aws:iam::aws:policy/AdministratorAccess"
  }
}

override_data {
  target = data.aws_iam_policy.read_only_access
  values = {
    arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
  }
}

override_data {
  target = data.aws_iam_policy.lambda_read_only_access
  values = {
    arn = "arn:aws:iam::aws:policy/AWSLambda_ReadOnlyAccess"
  }
}

override_data {
  target = data.aws_iam_policy.lambda_admin_access
  values = {
    arn = "arn:aws:iam::aws:policy/AWSLambda_FullAccess"
  }
}

override_data {
  target = data.aws_iam_policy.ecs_admin_access
  values = {
    arn = "arn:aws:iam::aws:policy/AmazonECS_FullAccess"
  }
}

override_module {
  target = module.github_runner
  outputs = {
    iam_role = {
      arn  = "arn:aws:iam::123456789012:role/test-runner"
      name = "test-runner"
    }
    security_group = {
      id   = "sg-0123456789abcdef0"
      name = "test-runner"
    }
  }
}

run "aws_github_environment_bootstrap_default_environment" {
  command = plan

  assert {
    condition = alltrue([
      github_actions_environment_secret.infra_ci["ROLE_ARN"].environment == "infra-prod-ci",
      github_actions_environment_secret.app_ci["ROLE_ARN"].environment == "app-prod-ci",
      github_actions_environment_secret.infra_cd["ROLE_ARN"].environment == "infra-prod-cd",
      github_actions_environment_secret.app_cd["ROLE_ARN"].environment == "app-prod-cd",
    ])
    error_message = "The default prefix flag must preserve existing prod GitHub secret names"
  }
}

run "aws_github_environment_bootstrap_prefix_flag_preserves_cloud_names" {
  command = plan

  variables {
    github_environment_prefix_enabled = true
  }

  assert {
    condition = alltrue([
      github_actions_environment_secret.infra_ci["ROLE_ARN"].environment == "infra-dx-prod-ci",
      aws_iam_role.infra_ci.name == "dx-p-eus1-test-infra-github-ci-role-01",
    ])
    error_message = "The prefix flag must affect GitHub environment names only"
  }
}

run "aws_github_environment_bootstrap_ced_tenant_environment" {
  command = plan

  variables {
    environment                       = merge(var.environment, { prefix = "ced" })
    github_environment_prefix_enabled = true
  }

  assert {
    condition = alltrue([
      github_actions_environment_secret.infra_ci["ROLE_ARN"].environment == "infra-ced-prod-ci",
      github_actions_environment_secret.app_ci["ROLE_ARN"].environment == "app-ced-prod-ci",
      github_actions_environment_secret.infra_cd["ROLE_ARN"].environment == "infra-ced-prod-cd",
      github_actions_environment_secret.app_cd["ROLE_ARN"].environment == "app-ced-prod-cd",
      aws_iam_role.infra_ci.name == "ced-p-eus1-test-infra-github-ci-role-01",
    ])
    error_message = "The ced prefix must use distinct CI/CD GitHub secret environments"
  }
}

run "aws_github_environment_bootstrap_cgn_tenant_environment" {
  command = plan

  variables {
    environment                       = merge(var.environment, { prefix = "cgn" })
    github_environment_prefix_enabled = true
  }

  assert {
    condition = alltrue([
      github_actions_environment_secret.infra_ci["ROLE_ARN"].environment == "infra-cgn-prod-ci",
      github_actions_environment_secret.app_ci["ROLE_ARN"].environment == "app-cgn-prod-ci",
      github_actions_environment_secret.infra_cd["ROLE_ARN"].environment == "infra-cgn-prod-cd",
      github_actions_environment_secret.app_cd["ROLE_ARN"].environment == "app-cgn-prod-cd",
    ])
    error_message = "The cgn prefix must use its own CI/CD GitHub secret environments"
  }
}
