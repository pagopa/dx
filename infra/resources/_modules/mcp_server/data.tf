# --- Data sources to fetch secrets from SSM Parameter Store ---

# Fetches the GSuite OAuth Client ID from SSM.
data "aws_ssm_parameter" "gsuite_oauth_client_id" {
  name = "/dx/gsuite_oauth_client_id"
}

# Fetches the GSuite OAuth Client Secret from SSM.
data "aws_ssm_parameter" "gsuite_oauth_client_secret" {
  name            = "/dx/gsuite_oauth_client_secret"
  with_decryption = true
}
