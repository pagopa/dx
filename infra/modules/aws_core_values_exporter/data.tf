data "terraform_remote_state" "core" {
  backend = "s3"

  config = {
    bucket         = var.core_state.bucket
    key            = var.core_state.key
    region         = var.core_state.region
    dynamodb_table = var.core_state.dynamodb_table
  }
}
