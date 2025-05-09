resource "aws_iam_openid_connect_provider" "this" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com",
  ]

  # The thumbprint list is not required for OIDC providers like GitHub
  # https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider#argument-reference
  thumbprint_list = ["ffffffffffffffffffffffffffffffffffffffff"]
}
