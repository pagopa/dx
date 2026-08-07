variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    region          = "eu-south-1"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/github_selfhosted_runner_on_codebuild/_tests"
    Test           = "true"
    TestName       = "Self-hosted runner CodeBuild contract tests"
  }

  repository = {
    owner = "pagopa"
    name  = "dx"
  }

  vpc = {
    id              = "vpc-0123456789abcdef0"
    private_subnets = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
  }

  personal_access_token = {
    value = "ghp_1234567890"
  }
}

mock_provider "aws" {}

override_data {
  target = data.aws_caller_identity.current
  values = {
    account_id = "123456789012"
  }
}

run "github_selfhosted_runner_on_codebuild_rejects_invalid_tier" {
  command = plan

  variables {
    tier = "xl"
  }

  expect_failures = [
    var.tier,
  ]
}

run "github_selfhosted_runner_on_codebuild_rejects_multiple_pat_sources" {
  command = plan

  variables {
    personal_access_token = {
      ssm_parameter_name = "/dx/github/personal-access-token"
      value              = "ghp_1234567890"
    }
  }

  expect_failures = [
    var.personal_access_token,
  ]
}

run "github_selfhosted_runner_on_codebuild_rejects_multiple_secret_sources" {
  command = plan

  variables {
    secrets = {
      TOKEN = {
        ssm_parameter_name   = "/dx/github/token"
        secrets_manager_name = "dx/github/token"
      }
    }
  }

  expect_failures = [
    var.secrets,
  ]
}

run "github_selfhosted_runner_on_codebuild_rejects_missing_secret_source" {
  command = plan

  variables {
    secrets = {
      TOKEN = {}
    }
  }

  expect_failures = [
    var.secrets,
  ]
}
