data "aws_iam_policy_document" "read_assets_bucket" {
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject*"]
    resources = ["${aws_s3_bucket.assets.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "AWS:SourceArn"
      values   = ["arn:${data.aws_partition.current.partition}:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/*"]
    }
  }

  statement {
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.assets.arn, "${aws_s3_bucket.assets.arn}/*"]

    condition {
      test     = "Bool"
      values   = ["false"]
      variable = "aws:SecureTransport"
    }

    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}
