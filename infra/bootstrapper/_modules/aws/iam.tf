# IAM policy document defining permissions for S3 access to the docs knowledge base bucket
# This creates a JSON policy document with read/write permissions for the MCP Server
#trivy:ignore:AVD-AWS-0057 IAM policy document uses wildcarded action 's3:*Object'
data "aws_iam_policy_document" "rw_docs_knowledge_base_policy" {
  # Allow listing objects in the bucket (required for S3 operations)
  statement {
    sid    = "ListObjectsInBucket"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
    ]
    resources = [
      "arn:aws:s3:::dx-${var.environment.env_short}-euc1-docs-knowledge-base-s3-01",
    ]
  }

  # Allow all object-level operations (read, write, delete) on objects within the bucket
  statement {
    sid    = "AllObjectActions"
    effect = "Allow"
    actions = [
      "s3:*Object",
    ]
    resources = [
      "arn:aws:s3:::dx-${var.environment.env_short}-euc1-docs-knowledge-base-s3-01/*",
    ]
  }
}

# Create an IAM policy resource from the policy document
# This policy will be attached to roles that need access to the docs knowledge base S3 bucket
resource "aws_iam_policy" "docs_knowledge_base_policy" {
  name        = "dx-${var.environment.env_short}-euc1-docs-knowledge-base-policy-01"
  description = "IAM policy for MCP Server Docs Knowledge Base S3 access"
  policy      = data.aws_iam_policy_document.rw_docs_knowledge_base_policy.json
}

# Attach the docs knowledge base policy to the continuous deployment (CD) role
# This gives the CD pipeline permissions to access the S3 bucket for docs operations
resource "aws_iam_role_policy_attachment" "docs_knowledge_base_role_attachment" {
  role       = module.bootstrap.identities.app.cd.name
  policy_arn = aws_iam_policy.docs_knowledge_base_policy.arn
}
