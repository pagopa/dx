# s3 bucket containing the knowledge base objects

# Creates an S3 bucket to store the knowledge base objects.
resource "aws_s3_bucket" "mcp_knowledge_base" {
  bucket = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "docs-knowledge-base"
    resource_type = "s3_bucket"
  }))
}
