module "core_values" {
  source  = "pagopa-dx/azure-core-values-exporter/azurerm"
  version = "~> 0.0"

  core_state = var.core_state
}

module "bootstrapper" {
  source  = "pagopa-dx/aws-github-environment-bootstrap/aws"
  version = "~> 0.0"

  environment = local.environment

  repository = {
    name = "my-project"
  }

  vpc = {
    id              = module.core_values.vpc.id
    private_subnets = module.core_values.private_subnet_ids
  }

  github_private_runner = {
    personal_access_token = {
      ssm_parameter_name = module.core_values.personal_access_token_ssm_parameter_name
    }
  }

  tags = local.tags
}
