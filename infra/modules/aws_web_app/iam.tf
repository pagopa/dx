data "aws_iam_policy_document" "amplify" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["amplify.amazonaws.com"]
    }
  }
}


data "aws_iam_policy_document" "secrets" {
  statement {
    sid    = "AllowReadingSecrets"
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters"
    ]
    resources = ["arn:aws:ssm:${var.environment.location}:${data.aws_caller_identity.current.account_id}:parameter/amplify/${aws_amplify_app.this.id}/*", "arn:aws:ssm:${var.environment.location}:${data.aws_caller_identity.current.account_id}:parameter/shared/amplify/${aws_amplify_app.this.id}/*"]
  }
}

resource "aws_iam_policy" "secrets" {
  name        = "${local.project}-${var.environment.app_name}-amplify-secrets-policy-${var.environment.instance_number}"
  description = "Allow amplify app ${aws_amplify_app.this.name} to read secrets"
  policy      = data.aws_iam_policy_document.secrets.json
  tags = var.tags
}

resource "aws_iam_role" "this" {
  name               = "${local.project}-${var.environment.app_name}-amplify-role-${var.environment.instance_number}"
  description        = "Role to assume in the application"
  assume_role_policy = data.aws_iam_policy_document.amplify.json
}

resource "aws_iam_role_policy_attachment" "secrets" {
  role       = aws_iam_role.this.name
  policy_arn = aws_iam_policy.secrets.arn
}