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
      BEDROCK_KNOWLEDGE_BASE_ID             = awscc_bedrock_knowledge_base.this.knowledge_base_id
      APPLICATIONINSIGHTS_CONNECTION_STRING = var.application_insights_connection_string
      APPINSIGHTS_SAMPLING_PERCENTAGE       = 100
      MCP_AUTH_TYPE                         = var.mcp_auth_type
      GITHUB_CLIENT_SECRET_SSM_PARAM        = aws_ssm_parameter.github_client_secret.name
      GITHUB_CLIENT_ID_SSM_PARAM            = aws_ssm_parameter.github_client_id.name
      ENCRYPTION_SECRET_SSM_PARAM           = aws_ssm_parameter.encryption_secret.name
      JWT_SECRET_SSM_PARAM                  = aws_ssm_parameter.jwt_secret.name
      MCP_SERVER_URL                        = "https://${var.dns.custom_domain_name}"
      TOKENS_DYNAMODB_TABLE_NAME            = aws_dynamodb_table.oauth_tokens.name
      LOG_LEVEL                             = "info"
    }
  }

  lifecycle {
    ignore_changes = [
      image_uri
    ]
  }

  tags = var.tags
}

# Secure SSM paramter to store GITHUB_CLIENT_SECRET
resource "aws_ssm_parameter" "github_client_secret" {
  name        = "/mcpserver/mcp-github-client-secret"
  description = "GitHub OAuth Client Secret for MCP Server"
  type        = "SecureString"
  value       = "REPLACE_WITH_GITHUB_CLIENT_SECRET"
  tags        = var.tags

  lifecycle {
    ignore_changes = [value]
  }
}

# Secure SSM paramter to store GITHUB_CLIENT_ID
resource "aws_ssm_parameter" "github_client_id" {
  name        = "/mcpserver/mcp-github-client-id"
  description = "GitHub OAuth Client ID for MCP Server"
  type        = "SecureString"
  value       = "REPLACE_WITH_GITHUB_CLIENT_ID"
  tags        = var.tags

  lifecycle {
    ignore_changes = [value]
  }
}

# Generate a random encryption secret (32 bytes)
ephemeral "random_password" "encryption_secret" {
  length  = 32
  special = true
}

# Secure SSM paramter to store ENCRYPTION_SECRET
resource "aws_ssm_parameter" "encryption_secret" {
  name             = "/mcpserver/mcp-encryption-secret"
  description      = "Encryption secret for MCP Server tokens"
  type             = "SecureString"
  value_wo         = ephemeral.random_password.encryption_secret.result
  value_wo_version = 1
  tags             = var.tags

  lifecycle {
    ignore_changes = [value]
  }
}

# Generate a random JWT secret (32 bytes)
ephemeral "random_password" "jwt_secret" {
  length  = 32
  special = true
}

# Secure SSM paramter to store JWT_SECRET
resource "aws_ssm_parameter" "jwt_secret" {
  name             = "/mcpserver/mcp-jwt-secret"
  description      = "JWT secret for MCP Server tokens"
  type             = "SecureString"
  value_wo         = ephemeral.random_password.jwt_secret.result
  value_wo_version = 1
  tags             = var.tags

  lifecycle {
    ignore_changes = [value]
  }
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

# Defines an IAM policy to allow the Lambda function to read all ssm parameters that start with /mcpserver/
resource "aws_iam_policy" "lambda_ssm_read_access" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "lambda-ssm-read-access"
    resource_type = "iam_policy"
  }))

  description = "IAM policy for Lambda to read all ssm parameters that start with /mcpserver/"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.naming_config.region}:${var.account_id}:parameter/mcpserver/*"
      }
    ]
  })
  tags = var.tags
}

# Attaches the bedrock access policy to the Lambda's IAM role.
resource "aws_iam_role_policy_attachment" "lambda_ssm_read_access" {
  role       = aws_iam_role.server.name
  policy_arn = aws_iam_policy.lambda_ssm_read_access.arn
}

resource "aws_iam_policy" "oauth_tokens_lambda_access" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "oauth-tokens-lambda-access"
    resource_type = "iam_policy"
  }))
  description = "Allow Lambda to PutItem, GetItem, DeleteItem, and DescribeTable on oauth_tokens table"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:DeleteItem",
          "dynamodb:DescribeTable"
        ]
        Resource = aws_dynamodb_table.oauth_tokens.arn
      }
    ]
  })
}
resource "aws_iam_role_policy_attachment" "lambda_oauth_tokens_access" {
  role       = aws_iam_role.server.name
  policy_arn = aws_iam_policy.oauth_tokens_lambda_access.arn
}
