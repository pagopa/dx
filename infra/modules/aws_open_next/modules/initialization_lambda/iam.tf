data "aws_iam_policy_document" "lambda_assume_role_policy" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_role" {
  name               = "${local.app_prefix}-lambda-role-${local.app_suffix}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_execution_role" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_policy" {
  statement {
    effect    = "Allow"
    actions   = ["xray:PutTraceSegments", "xray:PutTelemetryRecords"]
    resources = ["*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:DescribeTable",
      "dynamodb:BatchWriteItem"
    ]
    resources = [var.isr_tags_ddb.arn]
  }
}

resource "aws_iam_policy" "lambda_policy" {
  name        = "${local.app_prefix}-lambda-policy-${local.app_suffix}"
  description = "IAM policy for OpenNext initialization lambda function to enable X-Ray tracing and DynamoDB operations for ISR tag initialization"
  policy      = data.aws_iam_policy_document.lambda_policy.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attachment" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}
