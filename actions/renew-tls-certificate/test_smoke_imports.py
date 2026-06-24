#!/usr/bin/env python3
"""Smoke-test renew TLS certificate imports and pinned dependency versions."""

import os

import cryptography
import jwt

import le_create_acme_test_account
import le_renew_ssl_certificate_acme_tiny
import le_renew_ssl_certificate_generate_csr


def main():
    assert cryptography.__version__ == "48.0.1"
    assert jwt.__version__ == "2.13.0"
    assert le_create_acme_test_account.DEFAULT_DIRECTORY_URL.startswith("https://")
    assert (
        le_renew_ssl_certificate_acme_tiny.get_default_directory_url()
        == le_renew_ssl_certificate_acme_tiny.DEFAULT_DIRECTORY_URL
    )

    staging_directory_url = "https://acme-staging-v02.api.letsencrypt.org/directory"
    os.environ[
        le_renew_ssl_certificate_acme_tiny.DIRECTORY_URL_ENV_VAR
    ] = staging_directory_url
    assert (
        le_renew_ssl_certificate_acme_tiny.get_default_directory_url()
        == staging_directory_url
    )
    assert le_renew_ssl_certificate_generate_csr.__name__ == "le_renew_ssl_certificate_generate_csr"


if __name__ == "__main__":
    main()
