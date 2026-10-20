resource "aws_iam_role" "ecr_public_login" {
  count = var.ecr_public_login_enabled ? 1 : 0

  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = var.environment.domain
    name          = "ecr-public-login"
    resource_type = "iam_role"
  }))
  description = "Role to authenticate GitHub Actions to Amazon ECR Public"

  assume_role_policy = data.aws_iam_policy_document.github_assume_role_policy.json
}

resource "aws_iam_role_policy" "ecr_public_login" {
  count = var.ecr_public_login_enabled ? 1 : 0

  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = var.environment.domain
    name          = "ecr-public-login"
    resource_type = "iam_role_policy"
  }))
  role = aws_iam_role.ecr_public_login[0].name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ecr-public:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = "sts:GetServiceBearerToken"
        Resource = "*"
        Condition = {
          StringEquals = {
            "sts:AWSServiceName" = "ecr-public.amazonaws.com"
          }
        }
      }
    ]
  })
}
