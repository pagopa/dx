#!/usr/bin/env bash
# Deterministic CI smoke test for the renew-tls-certificate action scripts.

set -euo pipefail

ACTION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="$(mktemp -d)"
VENV_DIR="$WORK_DIR/venv"

resolve_python_bin() {
  if [ -n "${PYTHON_BIN:-}" ]; then
    printf '%s\n' "$PYTHON_BIN"
    return 0
  fi

  for candidate in python3.12 python3.11 python3.10 python3; do
    if command -v "$candidate" >/dev/null 2>&1; then
      if "$candidate" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)'; then
        printf '%s\n' "$candidate"
        return 0
      fi
    fi
  done

  echo "A Python interpreter >= 3.10 is required. Set PYTHON_BIN to a supported interpreter." >&2
  return 1
}

PYTHON_BIN="$(resolve_python_bin)"

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
