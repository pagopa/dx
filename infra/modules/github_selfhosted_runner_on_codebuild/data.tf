data "aws_caller_identity" "current" {}

data "aws_ssm_parameter" "github_personal_access_token" {
  count           = local.has_github_personal_access_token_ssm_parameter ? 1 : 0
  name            = var.personal_access_token.ssm_parameter_name
  with_decryption = true
}