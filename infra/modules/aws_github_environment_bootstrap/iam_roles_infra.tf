resource "aws_iam_role" "infra_ci" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = var.environment.domain
    name          = "infra-github-ci"
    resource_type = "iam_role"
  }))
  description = "Role to assume to run CI on the infrastructure via GitHub Actions"

  assume_role_policy = data.aws_iam_policy_document.github_assume_role_policy.json
}

resource "aws_iam_role_policy_attachment" "infra_ci_ro" {
  role       = aws_iam_role.infra_ci.name
  policy_arn = data.aws_iam_policy.read_only_access.arn
}

resource "aws_iam_role" "infra_cd" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = var.environment.domain
    name          = "infra-github-cd"
    resource_type = "iam_role"
  }))
  description = "Role to assume to run CD on the infrastructure via GitHub Actions"

  assume_role_policy = data.aws_iam_policy_document.github_assume_role_policy.json
}

resource "aws_iam_role_policy_attachment" "infra_cd_admin" {
  role       = aws_iam_role.infra_cd.name
  policy_arn = data.aws_iam_policy.admin_access.arn
}
