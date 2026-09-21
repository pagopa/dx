locals {
  tags = merge(
    var.tags,
    {
      ModuleSource  = "DX",
      ModuleVersion = try(jsondecode(file("${path.module}/module.json")).version, "unknown"),
      ModuleName    = try(jsondecode(file("${path.module}/module.json")).name, basename(path.module))
    }
  )

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

  # GitHub emits immutable subject claims that embed the numeric owner and
  # repository IDs for repositories created or renamed after 2026-07-15, while
  # older repositories still emit name-based subjects. Both are trusted.
  immutable_repository_slug = "${var.repository.owner}@${data.github_organization.owner.id}/${var.repository.name}@${data.github_repository.this.repo_id}"

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
