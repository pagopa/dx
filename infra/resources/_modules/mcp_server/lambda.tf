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

resource "aws_ecr_repository" "server" {
  name = "dx/mcp-server"

  tags = var.tags
}

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

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.server.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# iam policy that allows to query bedrock knowledge base and models
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
          "bedrock:InvokeModel",
          "bedrock:ListFoundationModels"
        ]
        Resource = "*"
      },
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
