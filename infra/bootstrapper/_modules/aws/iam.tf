#trivy:ignore:AVD-AWS-0057 IAM policy document uses wildcarded action 's3:*Object'
data "aws_iam_policy_document" "rw_docs_knowledge_base_policy" {
  statement {
    sid = "ListObjectsInBucket"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
    ]
    resources = [
      "arn:aws:s3:::dx-${var.environment.env_short}-euc1-docs-knowledge-base-s3-01",
    ]
  }

  statement {
    sid = "AllObjectActions"
    effect = "Allow"
    actions = [
      "s3:*Object",
    ]
    resources = [
      "arn:aws:s3:::dx-${var.environment.env_short}-euc1-docs-knowledge-base-s3-01/*",
    ]
  }
}
resource "aws_iam_policy" "docs_knowledge_base_policy" {
  name        = "dx-${var.environment.env_short}-euc1-docs-knowledge-base-policy-01"
  description = "IAM policy for MCP Server Docs Knowledge Base S3 access"
  policy      = data.aws_iam_policy_document.rw_docs_knowledge_base_policy.json
}

resource "aws_iam_role_policy_attachment" "docs_knowledge_base_role_attachment" {
  role       = module.bootstrap.identities.app.cd.name
  policy_arn = aws_iam_policy.docs_knowledge_base_policy.arn
}
