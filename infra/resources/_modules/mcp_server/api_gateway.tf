## HTTP API Gateway v2 exposing the Lambda as a proxy

# Defines the HTTP API Gateway v2.
resource "aws_apigatewayv2_api" "mcp_server" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "mcp-server"
    resource_type = "api_gateway_v2"
  }))
  protocol_type = "HTTP"
  tags          = var.tags
}

# Creates an integration between the API Gateway and the Lambda function.
resource "aws_apigatewayv2_integration" "lambda_proxy" {
  api_id                 = aws_apigatewayv2_api.mcp_server.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.server.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Defines a route for the /mcp path with a proxy.
resource "aws_apigatewayv2_route" "mcp" {
  api_id    = aws_apigatewayv2_api.mcp_server.id
  route_key = "ANY /mcp/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_proxy.id}"
}

# Defines the default route for the API Gateway.
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.mcp_server.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_proxy.id}"
}

# Defines the default stage for the API Gateway.
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.mcp_server.id
  name        = "$default"
  auto_deploy = true
  tags        = var.tags

  # Configure throttling limits for all routes
  # Default limits are 100 req/s (rate_limit) and 200 burst
  # Increasing to support high-volume MCP traffic
  default_route_settings {
    throttling_rate_limit  = 1000 # requests per second
    throttling_burst_limit = 2000 # burst capacity
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn
    format = jsonencode({
      "requestId" : "$context.requestId",
      "ip" : "$context.identity.sourceIp",
      "requestTime" : "$context.requestTime",
      "httpMethod" : "$context.httpMethod",
      "routeKey" : "$context.routeKey",
      "status" : "$context.status",
      "protocol" : "$context.protocol",
      "responseLength" : "$context.responseLength"
    })
  }
}

# Creates a CloudWatch Log Group for the API Gateway access logs.
# trivy:ignore:AVD-AWS-0017
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/api-gateway/${aws_apigatewayv2_api.mcp_server.name}"
  retention_in_days = 14
  tags              = var.tags
}

# Grants the API Gateway permission to invoke the Lambda function.
resource "aws_lambda_permission" "apigw_http" {
  statement_id  = "AllowAPIGatewayV2Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.server.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.mcp_server.execution_arn}/*/*"
}
