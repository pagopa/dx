## Custom domain for API Gateway HTTP v2
resource "aws_acm_certificate" "api_custom_domain" {
  domain_name       = var.dns.custom_domain_name
  validation_method = "DNS"
  tags              = var.tags
}

resource "aws_apigatewayv2_domain_name" "api_custom" {
  domain_name = var.dns.custom_domain_name
  domain_name_configuration {
    certificate_arn = aws_acm_certificate.api_custom_domain.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
  tags = var.tags
}

resource "aws_apigatewayv2_api_mapping" "api_custom" {
  api_id      = aws_apigatewayv2_api.mcp_server.id
  domain_name = aws_apigatewayv2_domain_name.api_custom.domain_name
  stage       = aws_apigatewayv2_stage.default.id
}
## HTTP API Gateway v2 exposing the Lambda as a proxy
resource "aws_apigatewayv2_api" "mcp_server" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "mcp-server"
    resource_type = "api_gateway_v2"
  }))
  protocol_type = "HTTP"
  tags          = var.tags
}

resource "aws_apigatewayv2_integration" "lambda_proxy" {
  api_id                 = aws_apigatewayv2_api.mcp_server.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.server.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "mcp" {
  api_id    = aws_apigatewayv2_api.mcp_server.id
  route_key = "ANY /mcp/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_proxy.id}"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.mcp_server.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_proxy.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.mcp_server.id
  name        = "$default"
  auto_deploy = true
  tags        = var.tags

  # Throttling settings: max 100 requests per second, burst up to 200
  default_route_settings {
    throttling_burst_limit = 200
    throttling_rate_limit  = 100
  }
}

resource "aws_lambda_permission" "apigw_http" {
  statement_id  = "AllowAPIGatewayV2Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.server.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.mcp_server.execution_arn}/*/*"
}
