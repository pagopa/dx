module "core_values" {
  source  = "pagopa-dx/aws-core-values-exporter/aws"
  version = "~> 2.0"

  core_state = local.core_state
}

module "bootstrapper" {
  source  = "pagopa-dx/aws-github-environment-bootstrap/aws"
  version = "~> 2.0"

  environment = local.environment

  repository = {
    name = "my-project"
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

  tags = local.tags
}
