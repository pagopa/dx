resource "aws_iam_role" "codebuild_role" {
  name = "${local.app_prefix}-gh-runner-${local.app_suffix}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "codebuild_policy" {
  role       = aws_iam_role.codebuild_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeBuildAdminAccess"
}

resource "aws_iam_policy" "github_connection" {
  name        = "${local.app_prefix}-gh-connection-${local.app_suffix}"
  description = "Policy to allow to use the github connection"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "codeconnections:*",
          "codestar-connections:*"
        ]
        Effect = "Allow"
        Resource = [
          "*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_connection" {
  role       = aws_iam_role.codebuild_role.name
  policy_arn = aws_iam_policy.github_connection.arn
}

resource "aws_iam_policy" "vpc_connection" {
  name        = "${local.app_prefix}-vpc-connection-${local.app_suffix}"
  description = "Policy to allow to use the vpc connection"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeDhcpOptions",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeVpcs"
        ]
        Effect = "Allow"
        Resource = [
          "*"
        ]
      },
      {
        Action = [
          "ec2:CreateNetworkInterfacePermission"
        ]
        Effect = "Allow"
        Resource = [
          "arn:aws:ec2:${var.environment.location}:${data.aws_caller_identity.current.account_id}:network-interface/*"
        ]
        Condition = {
          StringEquals = {
            "ec2:AuthorizedService" = "codebuild.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "vpc_connection" {
  role       = aws_iam_role.codebuild_role.name
  policy_arn = aws_iam_policy.vpc_connection.arn
}

resource "aws_iam_policy" "cloudwatch" {
  name        = "${local.app_prefix}-cloudwatch-${local.app_suffix}"
  description = "Policy to allow to log in cloudwatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents",
          "logs:GetLogEvents",
          "logs:FilterLogEvents",
        ]
        Effect = "Allow"
        Resource = [
          "arn:aws:logs:${var.environment.location}:${data.aws_caller_identity.current.account_id}:log-group:${local.cloudwatch_log_group}:*",
          "arn:aws:logs:${var.environment.location}:${data.aws_caller_identity.current.account_id}:log-group:${local.cloudwatch_log_group}:log-stream:log-stream/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.codebuild_role.name
  policy_arn = aws_iam_policy.cloudwatch.arn
}
