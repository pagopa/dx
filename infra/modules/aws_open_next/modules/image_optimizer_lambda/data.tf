data "archive_file" "lambda_zip" {
  type = "zip"

  source_dir  = "${path.module}/../../dummy_lambda"
  output_path = "${path.module}/../../dummy_lambda/${local.app_prefix}.zip"
}
