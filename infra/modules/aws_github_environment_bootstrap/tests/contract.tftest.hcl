variables {
  environment = {
    prefix          = "dx"
    env_short       = "p"
    region          = "eu-south-1"
    domain          = "test"
    app_name        = "github"
    instance_number = "01"
  }
  repository = {
    name = "example"
  }
  vpc = {
    id              = "vpc-0123456789abcdef0"
    private_subnets = ["subnet-0123456789abcdef0"]
  }
  github_private_runner = {
    codeconnection_arn = "arn:aws:codeconnections:eu-south-1:123456789012:connection/00000000-0000-0000-0000-000000000000"
    secrets            = {}
  }
  oidc_provider_arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
  tags              = {}
}

mock_provider "aws" {
  mock_resource "aws_iam_policy" {
    defaults = {
      arn = "arn:aws:iam::123456789012:policy/test-policy"
    }
  }

  mock_data "aws_iam_policy" {
    defaults = {
      arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
    }
  }

  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}"
    }
  }
}

mock_provider "github" {}

override_module {
  target = module.github_runner
  outputs = {
    security_group = {
      id   = "sg-0123456789abcdef0"
      name = "test-runner"
    }
    iam_role = {
      arn  = "arn:aws:iam::123456789012:role/test-runner"
      name = "test-runner"
    }
  }
}

run "aws_github_environment_bootstrap_ecr_public_production_defaults" {
  command = plan

  assert {
    condition = (
      keys(github_actions_secret.repo_secrets) == ["ECR_PUBLIC_ROLE_ARN"] &&
      aws_iam_role.ecr_public_login.name == "dx-p-eus1-test-ecr-public-login-role-01"
    )
    error_message = "Production bootstrap instances must create the shared login secret and their own dedicated role automatically."
  }

  assert {
    condition     = github_actions_environment_secret.infra_ci["ROLE_ARN"].environment == "infra-prod-ci"
    error_message = "ECR Public login must not change the production deployment environment secrets."
  }
}

run "aws_github_environment_bootstrap_ecr_public_seed_mock_state" {
  command = apply

  override_resource {
    target = aws_iam_role.ecr_public_login
    values = {
      arn = "arn:aws:iam::123456789012:role/test-ecr-public-original"
    }
  }

  assert {
    condition     = github_actions_secret.repo_secrets["ECR_PUBLIC_ROLE_ARN"].plaintext_value == "arn:aws:iam::123456789012:role/test-ecr-public-original"
    error_message = "The initial mocked creation must publish the instance's role ARN."
  }
}

run "aws_github_environment_bootstrap_ecr_public_ignore_value_changes" {
  command = plan

  plan_options {
    replace = [aws_iam_role.ecr_public_login]
  }

  variables {
    environment = merge(var.environment, { instance_number = "02" })
  }

  override_resource {
    target          = aws_iam_role.ecr_public_login
    override_during = plan
    values = {
      arn = "arn:aws:iam::123456789012:role/test-ecr-public-replacement"
    }
  }

  assert {
    condition     = output.ecr_public_role_arn == "arn:aws:iam::123456789012:role/test-ecr-public-replacement"
    error_message = "The instance output must expose the replacement role ARN."
  }

  assert {
    condition     = github_actions_secret.repo_secrets["ECR_PUBLIC_ROLE_ARN"].plaintext_value == "arn:aws:iam::123456789012:role/test-ecr-public-original"
    error_message = "A different desired role ARN must not update a repository secret already tracked in state."
  }
}
