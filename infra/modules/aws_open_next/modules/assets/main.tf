resource "aws_s3_bucket" "assets" {
  bucket = "${local.app_prefix}-assets-${local.app_suffix}"

  tags = var.tags
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.bucket

  block_public_acls       = true
  block_public_policy     = true
  restrict_public_buckets = true
  ignore_public_acls      = true
}

resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.bucket
  policy = data.aws_iam_policy_document.read_assets_bucket.json
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.bucket

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.bucket

  rule {

    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "assets" {
  depends_on = [aws_s3_bucket_versioning.assets]
  bucket     = aws_s3_bucket.assets.bucket

  rule {
    id     = "abort-failed-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }

  rule {
    id     = "clear-versioned-assets"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }
  }
}

resource "aws_cloudfront_origin_access_identity" "assets" {
  comment = "CloudFront OAI for Assets S3 Bucket"
}

