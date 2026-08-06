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
    TestName       = "Self-hosted runner CodeBuild unit tests"
  }

  docker_image = "ghcr.io/pagopa/dx-github-self-hosted-runner:sha-4693a86"
  tier         = "s"

  repository = {
    owner = "pagopa"
    name  = "dx"
  }

  vpc = {
    id              = "vpc-0123456789abcdef0"
    private_subnets = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
  }

  env_variables = {
    ENV_SHORT = "d"
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

run "github_selfhosted_runner_on_codebuild_configures_project" {
  command = plan

  assert {
    condition = alltrue([
      aws_codebuild_project.github_runner.artifacts[0].type == "NO_ARTIFACTS",
      aws_codebuild_project.github_runner.environment[0].type == "LINUX_CONTAINER",
      aws_codebuild_project.github_runner.environment[0].compute_type == "BUILD_GENERAL1_SMALL",
      aws_codebuild_project.github_runner.environment[0].image == var.docker_image,
      aws_codebuild_project.github_runner.source[0].location == "https://github.com/pagopa/dx.git",
    ])
    error_message = "CodeBuild project must use the requested image, small tier, and GitHub repository"
  }

  assert {
    condition = alltrue([
      aws_security_group.codebuild.vpc_id == var.vpc.id,
      aws_security_group_rule.codebuild_egress.type == "egress",
      aws_security_group_rule.codebuild_egress.from_port == 0,
      aws_security_group_rule.codebuild_egress.to_port == 0,
    ])
    error_message = "Security group must be attached to the supplied VPC and allow egress"
  }

  assert {
    condition     = one(aws_codebuild_project.github_runner.environment[0].environment_variable).name == "ENV_SHORT" && one(aws_codebuild_project.github_runner.environment[0].environment_variable).value == "d"
    error_message = "CodeBuild project must include the ENV_SHORT environment variable"
  }
}
