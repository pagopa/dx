locals {
  # Naming configuration for dx provider
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    region          = var.environment.region,
    name            = var.repository.name,
    instance_number = tonumber(var.environment.instance_number),
  }

  envs = {
    "d" = "dev"
    "u" = "uat"
    "p" = "prod"
  }

  env_name = local.envs[var.environment.env_short]

  repo_secrets = {}

  infra_ci = {
    secrets = {
      "ROLE_ARN" = aws_iam_role.infra_ci.arn
    }
  }

  app_ci = {
    secrets = {
      "ROLE_ARN" = aws_iam_role.app_ci.arn
    }
  }

  infra_cd = {
    secrets = {
      "ROLE_ARN" = aws_iam_role.infra_cd.arn
    }
  }

  app_cd = {
    secrets = {
      "ROLE_ARN" = aws_iam_role.app_cd.arn
    }
  }
}
