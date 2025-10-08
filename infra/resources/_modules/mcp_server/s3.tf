# s3 bucket containing the knowledge base objects

# Creates an S3 bucket to store the knowledge base objects.
# trivy:ignore:AVD-AWS-0089
# trivy:ignore:AVD-AWS-0090
resource "aws_s3_bucket" "mcp_knowledge_base" {
  bucket = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "docs-knowledge-base"
    resource_type = "s3_bucket"
  }))
}

# trivy:ignore:AVD-AWS-0132
resource "aws_s3_bucket_server_side_encryption_configuration" "mcp_knowledge_base" {
  bucket = aws_s3_bucket.mcp_knowledge_base.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "mcp_knowledge_base" {
  bucket = aws_s3_bucket.mcp_knowledge_base.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
