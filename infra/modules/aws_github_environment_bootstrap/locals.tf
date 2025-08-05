locals {
  prefix = "${var.environment.prefix}-${var.prefix.env_short}-${var.environment.location}-${var.environment.domain}"
  suffix = var.environment.instance_number

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
