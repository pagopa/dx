#!/usr/bin/env bash
# Real DEV-DEVEX end-to-end test for DNS-01 renewal and Key Vault import.

set -euo pipefail

ACTION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
WORK_DIR="$(mktemp -d)"
VENV_DIR="$WORK_DIR/venv"

: "${ARM_SUBSCRIPTION_ID:?ARM_SUBSCRIPTION_ID is required}"
: "${DNS_ZONE:?DNS_ZONE is required}"
: "${DNS_ZONE_RESOURCE_GROUP:?DNS_ZONE_RESOURCE_GROUP is required}"
: "${KEY_VAULT_NAME:?KEY_VAULT_NAME is required}"
: "${CSR_COMMON_NAME:?CSR_COMMON_NAME is required}"
: "${ACME_DIRECTORY_URL:?ACME_DIRECTORY_URL is required}"

CERTIFICATE_RUN_SUFFIX="${GITHUB_RUN_ID:-local-$(date +%s)}"
if [ -n "${GITHUB_RUN_ATTEMPT:-}" ]; then
  CERTIFICATE_RUN_SUFFIX="$CERTIFICATE_RUN_SUFFIX-$GITHUB_RUN_ATTEMPT"
fi
CERTIFICATE_NAME="${CSR_COMMON_NAME//./-}-$CERTIFICATE_RUN_SUFFIX"
DNS_CHALLENGE_RECORD_NAME="_acme-challenge.${CSR_COMMON_NAME%."$DNS_ZONE"}"

certificate_exists() {
  az keyvault certificate show \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$CERTIFICATE_NAME" >/dev/null 2>&1
}

delete_test_certificate() {
  if certificate_exists; then
    az keyvault certificate delete \
      --vault-name "$KEY_VAULT_NAME" \
      --name "$CERTIFICATE_NAME" >/dev/null
  fi
}

cleanup() {
  exit_code=$?
  cleanup_status=0
  set +e

  # The renewal script removes this on success; this covers interrupted or failed runs.
  az network dns record-set txt delete \
    --resource-group "$DNS_ZONE_RESOURCE_GROUP" \
    --zone-name "$DNS_ZONE" \
    --name "$DNS_CHALLENGE_RECORD_NAME" \
    --yes \
    2>/dev/null || true

  if ! delete_test_certificate; then
    cleanup_status=1
  fi

  rm -rf "$WORK_DIR"

  if [ "$exit_code" -eq 0 ] && [ "$cleanup_status" -ne 0 ]; then
    exit "$cleanup_status"
  fi
  exit "$exit_code"
}

trap cleanup EXIT

"$PYTHON_BIN" -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install --upgrade pip --quiet
"$VENV_DIR/bin/pip" install \
  --require-hashes \
  --requirement "$ACTION_DIR/le_renew_ssl_certificate_python_requirements.txt" \
  --quiet

"$VENV_DIR/bin/python" "$ACTION_DIR/le_create_acme_test_account.py" \
  --directory-url "$ACME_DIRECTORY_URL" \
  --private-key-out "$WORK_DIR/private_key.json" \
  --registration-out "$WORK_DIR/registration.json"

export AZURE_DNS_ZONE="$DNS_ZONE"
export AZURE_DNS_ZONE_RESOURCE_GROUP="$DNS_ZONE_RESOURCE_GROUP"
export AZURE_IDENTITY_TYPE="MANAGED_IDENTITY"
export AZURE_SUBSCRIPTION_ID="$ARM_SUBSCRIPTION_ID"

(
  cd "$WORK_DIR"

  "$VENV_DIR/bin/python" "$ACTION_DIR/le_renew_ssl_certificate_generate_csr.py" \
    --common-name "$CSR_COMMON_NAME" \
    --out csr.der \
    --keyout csr.key \
    --rsa-key-size 2048

  "$VENV_DIR/bin/python" "$ACTION_DIR/le_renew_ssl_certificate_acme_tiny.py" \
    --private-key private_key.json \
    --regr registration.json \
    --csr csr.der \
    --out certificate_chain.pem \
    --directory-url "$ACME_DIRECTORY_URL"

  mv certificate_chain.pem.0 certificate_chain.pem
  openssl pkcs12 \
    -inkey csr.key \
    -in certificate_chain.pem \
    -export \
    -passout pass: \
    -nodes \
    -out certificate_chain.pfx

  az keyvault certificate import \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$CERTIFICATE_NAME" \
    --disabled false \
    --file certificate_chain.pfx \
    --password "" >/dev/null
)

subject="$(az keyvault certificate show \
  --vault-name "$KEY_VAULT_NAME" \
  --name "$CERTIFICATE_NAME" \
  --query "policy.x509CertificateProperties.subject" \
  --output tsv)"

if [ "$subject" != "CN=$CSR_COMMON_NAME" ]; then
  echo "Unexpected certificate subject: $subject"
  exit 1
fi

echo "Imported test certificate '$CERTIFICATE_NAME' with subject '$subject'"
echo "renew-tls-certificate e2e test passed"
