#!/usr/bin/env bash
# Deterministic CI smoke test for the renew-tls-certificate action scripts.

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
  "$ACTION_DIR/le_create_acme_test_account.py" \
  "$ACTION_DIR/le_renew_ssl_certificate_acme_tiny.py" \
  "$ACTION_DIR/le_renew_ssl_certificate_generate_csr.py" \
  "$ACTION_DIR/test_smoke_imports.py" \
  "$ACTION_DIR/test_validate_csr.py"

(
  cd "$WORK_DIR"

  "$VENV_DIR/bin/python" "$ACTION_DIR/le_renew_ssl_certificate_generate_csr.py" \
    --common-name test.dx.pagopa.it \
    --out csr.der \
    --keyout csr.key \
    --rsa-key-size 2048 \
    --quiet

  "$VENV_DIR/bin/python" "$ACTION_DIR/test_validate_csr.py" csr.der test.dx.pagopa.it
)

PYTHONPATH="$ACTION_DIR" "$VENV_DIR/bin/python" "$ACTION_DIR/test_smoke_imports.py"

echo "renew-tls-certificate tests passed"
