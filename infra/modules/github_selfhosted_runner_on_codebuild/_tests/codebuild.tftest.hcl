provider "aws" {
  region = "eu-south-1"
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }

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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/github_selfhosted_runner_on_codebuild/tests"
      Test           = "true"
      TestName       = "Create Self Hosted Runner for test"
    }
  }
}

run "codebuild_is_correct_plan" {
  command = plan

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/github_selfhosted_runner_on_codebuild/tests"
      Test           = "true"
      TestName       = "Create Self Hosted Runner for test"
    }

    docker_image = "ghcr.io/pagopa/dx-github-self-hosted-runner:sha-4693a86"

    tier = "s"

    repository = {
      owner = "pagopa"
      name  = "dx"
    }

    vpc = {
      id              = run.setup_tests.vpc_id
      private_subnets = run.setup_tests.private_subnets
    }

    env_variables = {
      ENV_SHORT = "d"
    }

    personal_access_token = {
     value = "ghp_1234567890"
    }
  }

  assert {
    condition = alltrue([
      aws_codebuild_project.github_runner.artifacts[0].type == "NO_ARTIFACTS",
      aws_codebuild_project.github_runner.environment[0].type == "LINUX_CONTAINER",
      aws_codebuild_project.github_runner.environment[0].compute_type == "BUILD_GENERAL1_SMALL"
    ])
    error_message = "Invalid CodeBuild project configuration"
  }

  assert {
    condition = alltrue([
      aws_security_group.codebuild.vpc_id == var.vpc.id,
      aws_security_group_rule.codebuild_egress.type == "egress",
      aws_security_group_rule.codebuild_egress.from_port == 0,
      aws_security_group_rule.codebuild_egress.to_port == 0,
    ])
    error_message = "Invalid security group configuration"
  }

  assert {
    condition = (aws_codebuild_project.github_runner.environment[0].environment_variable[0].name == "ENV_SHORT") && (aws_codebuild_project.github_runner.environment[0].environment_variable[0].value == "d")
    error_message = "Environment variable ENV_SHORT not correctly set"
  }

  assert {
    condition = aws_codebuild_project.github_runner.environment[0].image == "ghcr.io/pagopa/dx-github-self-hosted-runner:sha-4693a86"
    error_message = "Custom docker image not correctly set"
  }
}
