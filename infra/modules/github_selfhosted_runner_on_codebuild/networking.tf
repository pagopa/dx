resource "aws_security_group" "codebuild" {
  name        = "${local.app_prefix}-gh-runner-${local.app_suffix}"
  description = "Security group for Codebuild container"
  vpc_id      = var.vpc.id

  # https://registry.terraform.io/providers/hashicorp/aws/5.35.0/docs/resources/security_group#recreating-a-security-group
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "codebuild_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow all outbound traffic for ${aws_codebuild_project.github_runner.name} codebuild project"
  security_group_id = aws_security_group.codebuild.id
}
