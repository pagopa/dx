resource "aws_iam_role" "app_ci" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = var.environment.domain
    name          = "app-github-ci"
    resource_type = "iam_role"
  }))
  description = "Role to assume to run CI for applications via GitHub Actions"

  assume_role_policy = data.aws_iam_policy_document.github_assume_role_policy.json
}

resource "aws_iam_role_policy_attachment" "app_ci_ro_lambda" {
  role       = aws_iam_role.app_ci.name
  policy_arn = data.aws_iam_policy.lambda_read_only_access.arn
}

resource "aws_iam_policy" "ro_ecs" {
  name   = "ECSReadOnlyAccess"
  policy = data.aws_iam_policy_document.ecs_read_only_access.json
}

resource "aws_iam_role_policy_attachment" "app_ci_ro_ecs" {
  role       = aws_iam_role.app_ci.name
  policy_arn = aws_iam_policy.ro_ecs.arn
}

resource "aws_iam_role" "app_cd" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = var.environment.domain
    name          = "app-github-cd"
    resource_type = "iam_role"
  }))
  description = "Role to assume to run CD for applications via GitHub Actions"

  assume_role_policy = data.aws_iam_policy_document.github_assume_role_policy.json
}

resource "aws_iam_role_policy_attachment" "app_cd_admin_lambda" {
  role       = aws_iam_role.app_cd.name
  policy_arn = data.aws_iam_policy.lambda_admin_access.arn
}

resource "aws_iam_role_policy_attachment" "app_cd_admin_ecs" {
  role       = aws_iam_role.app_cd.name
  policy_arn = data.aws_iam_policy.ecs_admin_access.arn
}
