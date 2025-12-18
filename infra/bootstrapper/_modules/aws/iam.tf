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
      "arn:aws:s3:::dx-${var.environment.env_short}-euc1-docs-kb-s3-01",
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
      "arn:aws:s3:::dx-${var.environment.env_short}-euc1-docs-kb-s3-01/*",
    ]
  }

  statement {
    sid    = "SyncKnowledgeBaseDataSource"
    effect = "Allow"
    actions = [
      "bedrock:GetKnowledgeBase",
      "bedrock:UpdateKnowledgeBase",
      "bedrock:GetKnowledgeBaseDocuments",
      "bedrock:IngestKnowledgeBaseDocuments",
      "bedrock:DeleteKnowledgeBaseDocuments",
      "bedrock:ListKnowledgeBases"
    ]
    resources = [
      "*",
    ]
  }
}

# Create an IAM policy resource from the policy document
# This policy will be attached to roles that need access to the docs knowledge base S3 bucket
resource "aws_iam_policy" "docs_knowledge_base_policy" {
  name        = "dx-${var.environment.env_short}-euc1-docs-kb-policy-01"
  description = "IAM policy for MCP Server Docs Knowledge Base S3 access"
  policy      = data.aws_iam_policy_document.rw_docs_knowledge_base_policy.json
}

# Attach the docs knowledge base policy to the continuous deployment (CD) role
# This gives the CD pipeline permissions to access the S3 bucket for docs operations
resource "aws_iam_role_policy_attachment" "docs_knowledge_base_role_attachment" {
  role       = module.bootstrap.identities.app.cd.name
  policy_arn = aws_iam_policy.docs_knowledge_base_policy.arn
}

data "aws_iam_policy_document" "list_tags_for_resources" {
  statement {
    sid    = "ListTagsForResources"
    effect = "Allow"
    actions = [
      "s3vectors:ListTagsForResource",
    ]
    resources = ["*"]
  }
}

# Create an IAM policy resource from the policy document
# This policy will be attached to roles that need access resource tags
resource "aws_iam_policy" "list_tags_for_resources" {
  name        = "dx-${var.environment.env_short}-euc1-list-tags-for-resources-01"
  description = "IAM policy to allow access to resource tags"
  policy      = data.aws_iam_policy_document.list_tags_for_resources.json
}

resource "aws_iam_role_policy_attachment" "list_tags_for_resources_infra_ci" {
  role       = module.bootstrap.identities.infra.ci.name
  policy_arn = aws_iam_policy.list_tags_for_resources.arn
}

# IAM policy document for AWS Cloud Control API and Bedrock permissions
# Required for managing Bedrock Knowledge Base resources via awscc provider
# trivy:ignore:AVD-AWS-0342 IAM policy allows 'iam:PassRole' action
data "aws_iam_policy_document" "bedrock_cloud_control" {
  # Cloud Control API permissions for managing Bedrock resources
  statement {
    sid    = "CloudControlAPIPermissions"
    effect = "Allow"
    actions = [
      "cloudformation:GetResource",
      "cloudformation:GetResourceRequestStatus",
      "cloudformation:ListResources",
    ]
    resources = ["*"]
  }

  # Bedrock Knowledge Base permissions
  statement {
    sid    = "BedrockKnowledgeBasePermissions"
    effect = "Allow"
    actions = [
      "bedrock:GetKnowledgeBase",
      "bedrock:ListKnowledgeBases",
      "bedrock:TagResource",
      "bedrock:UntagResource",
      "bedrock:ListTagsForResource",
      "bedrock:GetDataSource",
      "bedrock:ListDataSources",
    ]
    resources = ["*"]
  }

  # S3 Vectors permissions for vector storage
  statement {
    sid    = "S3VectorsPermissions"
    effect = "Allow"
    actions = [
      "s3vectors:GetVectorBucket",
      "s3vectors:ListVectorBuckets",
      "s3vectors:GetIndex",
      "s3vectors:ListIndices",
      "s3vectors:GetVectors",
      "s3vectors:QueryVectors",
      "s3vectors:TagResource",
      "s3vectors:UntagResource",
    ]
    resources = ["*"]
  }

  # IAM permissions for Bedrock to assume roles
  statement {
    sid    = "IAMPassRoleForBedrock"
    effect = "Allow"
    actions = [
      "iam:PassRole",
    ]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["bedrock.amazonaws.com"]
    }
  }
}

# Create IAM policy for Bedrock and Cloud Control API
resource "aws_iam_policy" "bedrock_cloud_control" {
  name        = "dx-${var.environment.env_short}-euc1-bedrock-cloud-control-01"
  description = "IAM policy for Bedrock Knowledge Base management via Cloud Control API"
  policy      = data.aws_iam_policy_document.bedrock_cloud_control.json
}

# Attach Bedrock Cloud Control policy to infrastructure CI role
resource "aws_iam_role_policy_attachment" "bedrock_cloud_control_infra_ci" {
  role       = module.bootstrap.identities.infra.ci.name
  policy_arn = aws_iam_policy.bedrock_cloud_control.arn
}
