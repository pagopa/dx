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
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = [var.assets_bucket.arn, "${var.assets_bucket.arn}/*"]
  }
}

resource "aws_iam_policy" "lambda_policy" {
  name        = "${local.app_prefix}-lambda-policy-${local.app_suffix}"
  description = "IAM policy for OpenNext image optimizer lambda function to enable X-Ray tracing and S3 read access for image optimization operations"
  policy      = data.aws_iam_policy_document.lambda_policy.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attachment" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

resource "aws_cloudfront_origin_access_control" "lambda" {
  name                              = "${local.app_prefix}-oac-${local.app_suffix}"
  description                       = "Origin Access Control for Server Lambda URL for project ${local.project}"
  origin_access_control_origin_type = "lambda"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
