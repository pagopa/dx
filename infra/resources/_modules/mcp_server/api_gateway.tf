# Creates an ACM certificate for the custom domain.
resource "aws_acm_certificate" "api_custom" {
  domain_name       = var.dns.custom_domain_name
  validation_method = "DNS"
  tags              = var.tags
}

resource "aws_api_gateway_rest_api" "main" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "api"
    resource_type = "api_gateway"
  }))
  description = "API Gateway for the MCP based on AWS Managed Services"

  body = templatefile("${path.module}/resources/openapi.yml", {
    API_DOMAIN_NAME          = var.dns.custom_domain_name
    COGNITO_ISSUER           = "https://${aws_cognito_user_pool.mcp_server.endpoint}"
    COGNITO_HOST             = "https://${aws_cognito_user_pool.mcp_server.domain}"
    REGION                   = var.naming_config.region
    API_GATEWAY_COGNITO_ROLE = aws_iam_role.api_gateway_role.arn
    COGNITO_USER_POOL_ID     = aws_cognito_user_pool.mcp_server.id
    COGNITO_USER_POOL_ARN    = aws_cognito_user_pool.mcp_server.arn
    MCP_LAMBDA_URI           = aws_lambda_function.server.invoke_arn
  })

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_deployment" "this" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode(aws_api_gateway_rest_api.main.body))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "this" {
  deployment_id = aws_api_gateway_deployment.this.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.naming_config.environment

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn
    format = jsonencode({
      "requestId" : "$context.requestId",
      "ip" : "$context.identity.sourceIp",
      "requestTime" : "$context.requestTime",
      "httpMethod" : "$context.httpMethod",
      "routeKey" : "$context.resourcePath",
      "status" : "$context.status",
      "protocol" : "$context.protocol",
      "responseLength" : "$context.responseLength"
    })
  }
}

resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/api-gateway/${aws_api_gateway_rest_api.main.name}"
  retention_in_days = 7
}

resource "aws_api_gateway_domain_name" "this" {
  domain_name              = var.dns.custom_domain_name
  regional_certificate_arn = aws_acm_certificate.api_custom.arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_base_path_mapping" "this" {
  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.this.stage_name
  domain_name = aws_api_gateway_domain_name.this.domain_name
}

# Grants the API Gateway permission to invoke the Lambda function.
resource "aws_lambda_permission" "apigw_http" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.server.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*"
}

resource "aws_api_gateway_account" "this" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_role.arn
}


#### IAM
resource "aws_iam_role" "api_gateway_role" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "apigw"
    resource_type = "iam_role"
  }))
  assume_role_policy = data.aws_iam_policy_document.api_gateway_cognito_assume_role_policy.json
}

resource "aws_iam_role_policy_attachment" "api_gateway_cognito" {
  policy_arn = aws_iam_policy.api_gateway_cognito.arn
  role       = aws_iam_role.api_gateway_role.name
}

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch_logs" {
  role       = aws_iam_role.api_gateway_role.name
  policy_arn = data.aws_iam_policy.api_gateway_cloudwatch_logs.arn
}

resource "aws_api_gateway_account" "logging" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_role.arn
  depends_on          = [aws_iam_role_policy_attachment.api_gateway_cognito]
}

resource "aws_iam_policy" "api_gateway_cognito" {
  name        = "ApiGatewayCognitoPolicy"
  description = "Policy for API Gateway to access Cognito"
  policy      = data.aws_iam_policy_document.api_gateway_cognito_policy.json
}
