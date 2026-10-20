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

run "aws_github_environment_bootstrap_ecr_public_non_owner" {
  command = plan

  variables {
    ecr_public_login_enabled = false
  }

  assert {
    condition = (
      length(github_actions_secret.repo_secrets) == 0 &&
      length(aws_iam_role.ecr_public_login) == 0 &&
      length(aws_iam_role_policy.ecr_public_login) == 0 &&
      output.ecr_public_role_arn == null
    )
    error_message = "Non-owner environments must not manage the shared repository secret or create another ECR Public role."
  }

  assert {
    condition     = github_actions_environment_secret.infra_ci["ROLE_ARN"].environment == "infra-prod-ci"
    error_message = "Non-owner environments must still bootstrap their own deployment secrets."
  }
}

run "aws_github_environment_bootstrap_ecr_public_null_keeps_default" {
  command = plan

  variables {
    ecr_public_login_enabled = null
  }

  assert {
    condition = (
      length(github_actions_secret.repo_secrets) == 0 &&
      length(aws_iam_role.ecr_public_login) == 0 &&
      length(aws_iam_role_policy.ecr_public_login) == 0 &&
      output.ecr_public_role_arn == null
    )
    error_message = "Null passed through an optional caller input must retain the safe disabled default."
  }
}
