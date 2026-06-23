#!/usr/bin/env python3
"""Smoke-test renew TLS certificate imports and key module defaults."""

import cryptography
import jwt

import le_create_acme_test_account
import le_renew_ssl_certificate_acme_tiny
import le_renew_ssl_certificate_generate_csr


def main():
    assert cryptography.__version__
    assert jwt.__version__
    assert le_create_acme_test_account.DEFAULT_DIRECTORY_URL.startswith("https://")
    assert le_renew_ssl_certificate_acme_tiny.DEFAULT_DIRECTORY_URL.startswith("https://")
    assert le_renew_ssl_certificate_generate_csr.__name__ == "le_renew_ssl_certificate_generate_csr"


if __name__ == "__main__":
    main()
