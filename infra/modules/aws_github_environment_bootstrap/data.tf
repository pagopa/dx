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

# The numeric GitHub IDs are required to trust the immutable OIDC subject claims
# (`repo:OWNER@OWNER-ID/REPO@REPO-ID:...`) emitted by repositories created or
# renamed after 2026-07-15. `summary_only` avoids listing repositories and
# members when reading the organization.
data "github_organization" "owner" {
  name         = var.repository.owner
  summary_only = true
}

data "github_repository" "this" {
  name = var.repository.name
}

data "aws_iam_policy_document" "github_environment_assume_role_policy" {
  for_each = {
    infra_ci = "infra-${local.env_name}-ci"
    infra_cd = "infra-${local.env_name}-cd"
    app_ci   = "app-${local.env_name}-ci"
    app_cd   = "app-${local.env_name}-cd"
  }

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.repository.owner}/${var.repository.name}:environment:${each.value}",
        "repo:${local.immutable_repository_slug}:environment:${each.value}",
      ]
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

data "aws_iam_policy_document" "ecr_public_assume_role_policy" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    # Both subject formats are trusted: repositories created before 2026-07-15
    # keep the name-based format, newer ones embed the numeric owner and
    # repository IDs. AWS evaluates StringLike as a match against any value.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.repository.owner}/${var.repository.name}:*",
        "repo:${local.immutable_repository_slug}:*",
      ]
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

data "aws_iam_policy_document" "ecr_push_access" {
  statement {
    effect = "Allow"
    actions = [
      "ecr:CompleteLayerUpload",
      "ecr:GetAuthorizationToken",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:InitiateLayerUpload",
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:PutImage"
    ]
    resources = ["*"]
  }
}
