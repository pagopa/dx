resource "aws_security_group" "lambda" {
  count = var.vpc == null ? 0 : 1

  name        = "${local.app_prefix}-lambda-sg-${local.app_suffix}"
  description = "Security group for OpenNext server lambda function allowing outbound traffic for external API calls and resource access"
  vpc_id      = var.vpc.id

  tags = var.tags
}

#trivy:ignore:AVD-AWS-0104
resource "aws_security_group_rule" "lambda_egress" {
  count = var.vpc == null ? 0 : 1

  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow all outbound traffic for ${aws_lambda_function.function.function_name} lambda function"
  security_group_id = aws_security_group.lambda[0].id
}
