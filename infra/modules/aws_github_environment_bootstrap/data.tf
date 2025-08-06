data "aws_iam_policy" "admin_access" {
  name = "AdministratorAccess"
}

data "aws_iam_policy" "read_only_access" {
  name = "ReadOnlyAccess"
}

data "aws_iam_policy" "lambda_read_only_access" {
  name = "AWSLambda_ReadOnlyAccess"
}

data "aws_iam_policy_document" "ecs_read_only_access" {
  statement {
    effect = "Allow"
    actions = [
      "ecs:List*",
      "ecs:Get*",
      "ecs:Describe*",
    ]
    resources = ["*"]
  }
}

data "aws_iam_policy" "lambda_admin_access" {
  name = "AWSLambda_FullAccess"
}

data "aws_iam_policy" "ecs_admin_access" {
  name = "AmazonECS_FullAccess"
}

data "aws_iam_policy_document" "github_assume_role_policy" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.this.arn]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.repository.owner}/${var.repository.name}:*"]
    }

    condition {
      test     = "ForAllValues:StringEquals"
      variable = "token.actions.githubusercontent.com:iss"
      values   = ["https://token.actions.githubusercontent.com"]
    }

    condition {
      test     = "ForAllValues:StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}
