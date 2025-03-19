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
      "ssm:GetParametersByPath",
      "ssm:GetParameters",
      "ssm:GetParameter",
      "ssm:DescribeParameters"
    ]
    resources = [
      "arn:aws:ssm:${var.environment.location}:${data.aws_caller_identity.current.account_id}:parameter/amplify/${aws_amplify_app.this.id}/",
      "arn:aws:ssm:${var.environment.location}:${data.aws_caller_identity.current.account_id}:parameter/shared/amplify/${aws_amplify_app.this.id}/",
      "arn:aws:ssm:${var.environment.location}:${data.aws_caller_identity.current.account_id}:parameter/amplify/${aws_amplify_app.this.id}/*",
      "arn:aws:ssm:${var.environment.location}:${data.aws_caller_identity.current.account_id}:parameter/shared/amplify/${aws_amplify_app.this.id}/*"
    ]
  }
}

data "aws_iam_policy_document" "logging" {
  statement {
    sid    = "PushLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "arn:aws:logs:${var.environment.location}:${data.aws_caller_identity.current.account_id}:log-group:/aws/amplify/*:log-stream:*"
    ]
  }

  statement {
    sid    = "CreateLogGroup"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup"
    ]
    resources = [
      "arn:aws:logs:${var.environment.location}:${data.aws_caller_identity.current.account_id}:log-group:/aws/amplify/*"
    ]
  }

  statement {
    sid    = "DescribeLogGroups"
    effect = "Allow"
    actions = [
      "logs:DescribeLogGroups"
    ]
    resources = [
      "arn:aws:logs:${var.environment.location}:${data.aws_caller_identity.current.account_id}:log-group:*"
    ]
  }
}

resource "aws_iam_policy" "secrets" {
  name        = "${local.project}-${var.environment.app_name}-amplify-secrets-policy-${var.environment.instance_number}"
  description = "Allow amplify app ${aws_amplify_app.this.name} to read secrets"
  policy      = data.aws_iam_policy_document.secrets.json
  tags        = var.tags
}

resource "aws_iam_policy" "logging" {
  name        = "${local.project}-${var.environment.app_name}-amplify-logging-policy-${var.environment.instance_number}"
  description = "Allow amplify app ${aws_amplify_app.this.name} to push logs to cloudwatch"
  policy      = data.aws_iam_policy_document.logging.json
  tags        = var.tags
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

resource "aws_iam_role_policy_attachment" "logging" {
  role       = aws_iam_role.this.name
  policy_arn = aws_iam_policy.logging.arn
}