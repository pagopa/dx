# Defines the Lambda function for the MCP server.
# trivy:ignore:AVD-AWS-0066
resource "aws_lambda_function" "server" {
  function_name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "mcp-server"
    resource_type = "lambda_function"
  }))
  description = "Lambda function running the DX MCP server"

  image_uri    = "${aws_ecr_repository.server.repository_url}:latest"
  package_type = "Image"

  timeout       = 29
  memory_size   = 256
  architectures = ["arm64"]
  role          = aws_iam_role.server.arn

  environment {
    variables = {
      BEDROCK_KNOWLEDGE_BASE_ID = var.bedrock_knowledge_base_id
    }
  }

  lifecycle {
    ignore_changes = [
      image_uri
    ]
  }

  tags = var.tags
}

# Creates an ECR repository for the Lambda function's container image.
# trivy:ignore:AVD-AWS-0033 Use a Customer Managed Key
# trivy:ignore:AVD-AWS-0031
resource "aws_ecr_repository" "server" {
  name = "dx/mcp-server"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}

# Defines the IAM role for the Lambda function.
resource "aws_iam_role" "server" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "lambda-mcp-server"
    resource_type = "iam_role"
  }))

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })
  tags = var.tags
}

# Attaches the basic execution role policy to the Lambda's IAM role.
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.server.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# iam policy that allows to query bedrock knowledge base and models

# Defines an IAM policy to allow the Lambda function to access Bedrock.
resource "aws_iam_policy" "lambda_bedrock_access" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "lambda-bedrock-access"
    resource_type = "iam_policy"
  }))

  description = "IAM policy for Lambda to access Bedrock knowledge bases and models"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:ListKnowledgeBases",
          "bedrock:GetKnowledgeBase",
          "bedrock:QueryKnowledgeBase",
          "bedrock:Retrieve"
        ]
        Resource = "arn:aws:bedrock:${var.naming_config.region}:${var.account_id}:knowledge-base/${var.bedrock_knowledge_base_id}"
      }
    ]
  })
  tags = var.tags
}

# Attaches the bedrock access policy to the Lambda's IAM role.
resource "aws_iam_role_policy_attachment" "lambda_bedrock_access" {
  role       = aws_iam_role.server.name
  policy_arn = aws_iam_policy.lambda_bedrock_access.arn
}
