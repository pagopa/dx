# --- Data sources to fetch secrets from SSM Parameter Store ---

# Fetches the GSuite OAuth Client ID from SSM.
data "aws_ssm_parameter" "gsuite_oauth_client_id" {
  name = "/dx/gsuite_oauth_client_id"
}

# Fetches the GSuite OAuth Client Secret from SSM.
data "aws_ssm_parameter" "gsuite_oauth_client_secret" {
  name            = "/dx/gsuite_oauth_client_secret"
  with_decryption = true
}

data "aws_iam_policy_document" "api_gateway_cognito_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["apigateway.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "api_gateway_cognito_policy" {
  statement {
    actions = [
      "cognito-idp:CreateUserPoolClient",
      "cognito-idp:DescribeUserPoolClient"
    ]
    resources = [
      aws_cognito_user_pool.mcp_server.arn
    ]
  }
}

data "aws_iam_policy" "api_gateway_cloudwatch_logs" {
  name = "AmazonAPIGatewayPushToCloudWatchLogs"
}

