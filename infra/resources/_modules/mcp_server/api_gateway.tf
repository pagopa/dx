## REST API Gateway exposing the Lambda as a proxy

# IAM role for API Gateway to write CloudWatch logs
resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "apigw-cloudwatch"
    resource_type = "iam_role"
  }))

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "apigateway.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

# Attach managed policy for CloudWatch logging
resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# Set CloudWatch role at account level (required once per region)
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

# REST API Gateway
resource "aws_api_gateway_rest_api" "mcp_server" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "mcp-server"
    resource_type = "api_gateway"
  }))
  description = "REST API Gateway for MCP Server with WAF support"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.tags
}

# Proxy resource to catch all paths
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.mcp_server.id
  parent_id   = aws_api_gateway_rest_api.mcp_server.root_resource_id
  path_part   = "{proxy+}"
}

# ANY method on proxy resource
# trivy:ignore:AVD-AWS-0004 - Authorization handled by OAuth 2.0 at Lambda application level
resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.mcp_server.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

# Lambda integration for proxy
resource "aws_api_gateway_integration" "lambda_proxy" {
  rest_api_id             = aws_api_gateway_rest_api.mcp_server.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.server.invoke_arn
}

# ANY method on root resource
# trivy:ignore:AVD-AWS-0004 - Authorization handled by OAuth 2.0 at Lambda application level
resource "aws_api_gateway_method" "proxy_root" {
  rest_api_id   = aws_api_gateway_rest_api.mcp_server.id
  resource_id   = aws_api_gateway_rest_api.mcp_server.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

# Lambda integration for root
resource "aws_api_gateway_integration" "lambda_root" {
  rest_api_id             = aws_api_gateway_rest_api.mcp_server.id
  resource_id             = aws_api_gateway_rest_api.mcp_server.root_resource_id
  http_method             = aws_api_gateway_method.proxy_root.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.server.invoke_arn
}

## /ask endpoint for Bedrock Knowledge Base (reuses MCP server Lambda)

# /ask resource
resource "aws_api_gateway_resource" "ask" {
  rest_api_id = aws_api_gateway_rest_api.mcp_server.id
  parent_id   = aws_api_gateway_rest_api.mcp_server.root_resource_id
  path_part   = "ask"
}

# POST method on /ask resource
# trivy:ignore:AVD-AWS-0004 - Authorization handled by OAuth 2.0 at application level
resource "aws_api_gateway_method" "ask" {
  rest_api_id   = aws_api_gateway_rest_api.mcp_server.id
  resource_id   = aws_api_gateway_resource.ask.id
  http_method   = "POST"
  authorization = "NONE"

  request_parameters = {
    "method.request.header.Content-Type" = true
  }
}

# Lambda integration for /ask endpoint (reuses MCP server Lambda)
resource "aws_api_gateway_integration" "bedrock_ask" {
  rest_api_id             = aws_api_gateway_rest_api.mcp_server.id
  resource_id             = aws_api_gateway_resource.ask.id
  http_method             = aws_api_gateway_method.ask.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.server.invoke_arn
}



# Deployment
resource "aws_api_gateway_deployment" "mcp_server" {
  rest_api_id = aws_api_gateway_rest_api.mcp_server.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_integration.lambda_proxy.id,
      aws_api_gateway_method.proxy_root.id,
      aws_api_gateway_integration.lambda_root.id,
      aws_api_gateway_resource.ask.id,
      aws_api_gateway_method.ask.id,
      aws_api_gateway_integration.bedrock_ask.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.lambda_proxy,
    aws_api_gateway_integration.lambda_root,
    aws_api_gateway_integration.bedrock_ask
  ]
}

# Stage with logging configuration
# trivy:ignore:AVD-AWS-0003 - X-Ray tracing not required for this MCP server use case
resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.mcp_server.id
  rest_api_id   = aws_api_gateway_rest_api.mcp_server.id
  stage_name    = "prod"

  # Access logging
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }
  depends_on = [aws_api_gateway_account.main]
  tags       = var.tags
}

# Method settings for detailed metrics and throttling
# trivy:ignore:AVD-AWS-0190 - Caching not enabled as MCP API responses are dynamic and not cacheable
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.mcp_server.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled    = true
    logging_level      = "INFO"
    data_trace_enabled = false

    # Throttling settings
    throttling_rate_limit  = 1000 # requests per second
    throttling_burst_limit = 2000 # burst capacity
  }
}

# CloudWatch Log Group for API Gateway access logs
# trivy:ignore:AVD-AWS-0017
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/api-gateway/${aws_api_gateway_rest_api.mcp_server.name}"
  retention_in_days = 14
  tags              = var.tags
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.server.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.mcp_server.execution_arn}/*/*"
}

# ACM Certificate for custom domain
resource "aws_acm_certificate" "api_custom_domain" {
  domain_name       = var.dns.custom_domain_name
  validation_method = "DNS"
  tags              = var.tags

  lifecycle {
    create_before_destroy = true
  }
}

# ACM Certificate Validation
resource "aws_acm_certificate_validation" "api_custom_domain" {
  certificate_arn         = aws_acm_certificate.api_custom_domain.arn
  validation_record_fqdns = [for record in azurerm_dns_cname_record.acm_validation : record.fqdn]
}

# Custom domain name for API Gateway
resource "aws_api_gateway_domain_name" "mcp_server" {
  domain_name              = var.dns.custom_domain_name
  regional_certificate_arn = aws_acm_certificate_validation.api_custom_domain.certificate_arn
  security_policy          = "TLS_1_2"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.tags
}

# Base path mapping
resource "aws_api_gateway_base_path_mapping" "mcp_server" {
  api_id      = aws_api_gateway_rest_api.mcp_server.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  domain_name = aws_api_gateway_domain_name.mcp_server.domain_name
}
