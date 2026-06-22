#!/usr/bin/env bash

set -euo pipefail

ACTION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
WORK_DIR="$(mktemp -d)"
VENV_DIR="$WORK_DIR/venv"

# Keep this test deterministic: it never calls Azure DNS, Key Vault, or ACME.
cleanup() {
  rm -rf "$WORK_DIR"
}

trap cleanup EXIT

"$PYTHON_BIN" -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install --upgrade pip --quiet
"$VENV_DIR/bin/pip" install \
  --require-hashes \
  --requirement "$ACTION_DIR/le_renew_ssl_certificate_python_requirements.txt" \
  --quiet

"$VENV_DIR/bin/python" -m py_compile \
  "$ACTION_DIR/le_create_acme_account.py" \
  "$ACTION_DIR/le_renew_ssl_certificate_acme_tiny.py" \
  "$ACTION_DIR/le_renew_ssl_certificate_generate_csr.py"

(
  cd "$WORK_DIR"

  "$VENV_DIR/bin/python" "$ACTION_DIR/le_renew_ssl_certificate_generate_csr.py" \
    --common-name test.dx.pagopa.it \
    --out csr.der \
    --keyout csr.key \
    --rsa-key-size 2048 \
    --quiet

  "$VENV_DIR/bin/python" - <<'PY'
from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import ExtensionOID, NameOID

with open("csr.der", "rb") as csr_file:
    csr = x509.load_der_x509_csr(csr_file.read())

common_name = csr.subject.get_attributes_for_oid(NameOID.COMMON_NAME)[0].value
subject_alternative_names = csr.extensions.get_extension_for_oid(
    ExtensionOID.SUBJECT_ALTERNATIVE_NAME
).value.get_values_for_type(x509.DNSName)
public_key = csr.public_key()

assert common_name == "test.dx.pagopa.it"
assert subject_alternative_names == ["test.dx.pagopa.it"]
assert isinstance(public_key, rsa.RSAPublicKey)
assert public_key.key_size == 2048
PY
)

PYTHONPATH="$ACTION_DIR" "$VENV_DIR/bin/python" - <<'PY'
import cryptography
import jwt
import le_create_acme_account
import le_renew_ssl_certificate_acme_tiny
import le_renew_ssl_certificate_generate_csr

assert cryptography.__version__ == "48.0.1"
assert jwt.__version__ == "2.13.0"
assert le_create_acme_account.DEFAULT_DIRECTORY_URL.startswith("https://")
assert le_renew_ssl_certificate_acme_tiny.DEFAULT_DIRECTORY_URL.startswith("https://")
assert le_renew_ssl_certificate_generate_csr.__name__ == "le_renew_ssl_certificate_generate_csr"
PY

echo "renew-tls-certificate tests passed"
