resource "aws_iam_openid_connect_provider" "this" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com",
  ]

  # The thumbprint list is not required for OIDC providers like GitHub, so a placeholder is enough
  # Ref. https://medium.com/%40thiagosalvatore/using-terraform-to-connect-github-actions-and-aws-with-oidc-0e3d27f00123
  # https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider#argument-reference
  thumbprint_list = ["ffffffffffffffffffffffffffffffffffffffff"]
}
