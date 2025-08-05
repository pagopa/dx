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

  env_long = local.envs[var.environment.env_short]

  repo_secrets = {}

  infra_ci = {
    secrets = {
      "INFRA_CI_ROLE_ARN" = aws_iam_role.infra_ci.arn
    }
  }

  app_ci = {
    secrets = {
      "APP_CI_ROLE_ARN" = aws_iam_role.app_ci.arn
    }
  }

  infra_cd = {
    secrets = {
      "INFRA_CD_ROLE_ARN" = aws_iam_role.infra_cd.arn
    }
  }

  app_cd = {
    secrets = {
      "APP_CD_ROLE_ARN" = aws_iam_role.app_cd.arn
    }
  }
}
