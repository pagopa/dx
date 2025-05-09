resource "aws_iam_role" "app_cd" {
  name        = "${local.prefix}-app-github-cd-role-${local.suffix}"
  description = "Role to assume to run CD for applications via GitHub Actions"

  assume_role_policy = data.aws_iam_policy_document.github_assume_role_policy.json
}

resource "aws_iam_role_policy_attachment" "app_cd_admin" {
  role       = aws_iam_role.app_cd.name
  policy_arn = data.aws_iam_policy.admin_access.arn
}
