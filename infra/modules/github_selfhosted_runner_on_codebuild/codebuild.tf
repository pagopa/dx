resource "aws_codebuild_project" "github_runner" {
  name          = "${local.app_prefix}-runner"
  description   = "CodeBuild project for self-hosted GitHub runner"
  service_role  = aws_iam_role.codebuild_role.arn
  build_timeout = var.build_timeout
  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = local.compute_type[var.tier]
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true

    dynamic "environment_variable" {
      for_each = var.env_variables
      content {
        name  = environment_variable.key
        value = environment_variable.value
      }
    }

    dynamic "environment_variable" {
      for_each = var.secrets
      content {
        name  = environment_variable.key
        value = coalesce(environment_variable.value.ssm_parameter_name, environment_variable.value.secrets_manager_name)
        type  = environment_variable.value.ssm_parameter_name != null ? "PARAMETER_STORE" : "SECRETS_MANAGER"
      }
    }
  }

  source {
    type            = "GITHUB"
    location        = "https://github.com/${var.repository.owner}/${var.repository.name}.git"
    git_clone_depth = 1
  }

  vpc_config {
    vpc_id             = var.vpc.id
    subnets            = var.vpc.private_subnets
    security_group_ids = [aws_security_group.codebuild.id]
  }

  logs_config {
    cloudwatch_logs {
      group_name  = local.cloudwatch_log_group
      stream_name = local.cloudwatch_log_stream
    }
  }

  tags = var.tags
}

resource "aws_codebuild_source_credential" "string" {
  count       = local.has_github_personal_access_token ? 1 : 0
  auth_type   = "PERSONAL_ACCESS_TOKEN"
  server_type = "GITHUB"
  token       = var.personal_access_token.value
}

resource "aws_codebuild_source_credential" "ssm" {
  count       = local.has_github_personal_access_token_ssm_parameter ? 1 : 0
  auth_type   = "PERSONAL_ACCESS_TOKEN"
  server_type = "GITHUB"
  token       = data.aws_ssm_parameter.personal_access_token[0].value
}

resource "aws_codebuild_source_credential" "codeconnection" {
  count       = (!local.has_github_personal_access_token_ssm_parameter && !local.has_github_personal_access_token) ? 1 : 0
  auth_type   = "CODECONNECTIONS"
  server_type = "GITHUB"
  token       = var.codeconnection_arn
}

resource "aws_codebuild_webhook" "github_webhook" {
  project_name = aws_codebuild_project.github_runner.name
  build_type   = "BUILD"

  filter_group {
    filter {
      type    = "EVENT"
      pattern = "WORKFLOW_JOB_QUEUED"
    }
  }

  depends_on = [aws_iam_role_policy_attachment.github_connection, aws_codebuild_source_credential.string, aws_codebuild_source_credential.ssm, aws_codebuild_source_credential.codeconnection]
}
