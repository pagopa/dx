#!/usr/bin/env python3
"""Create an ephemeral ACME account for staging end-to-end tests."""

import argparse
import base64
import json
import urllib.request

import cryptography.hazmat.primitives.hashes
import cryptography.hazmat.primitives.serialization
import cryptography.hazmat.primitives.asymmetric.padding
import jwcrypto.jwk

DEFAULT_DIRECTORY_URL = "https://acme-v02.api.letsencrypt.org/directory"


def _b64(data):
    return base64.urlsafe_b64encode(data).decode("utf8").replace("=", "")


def _request(url, data=None, headers=None):
    request = urllib.request.Request(url, data=data, headers=headers or {})
    if request.type != "https":
        raise ValueError(f"Disallowed schema: {url}")
    with urllib.request.urlopen(request) as response:
        body = response.read().decode("utf8")
        return (json.loads(body) if body else {}, response.headers)


def create_account(directory_url, private_key_out, registration_out):
    directory, _ = _request(directory_url)
    _, nonce_headers = _request(directory["newNonce"])
    key = jwcrypto.jwk.JWK.generate(kty="RSA", size=2048)
    private_key = cryptography.hazmat.primitives.serialization.load_pem_private_key(
        key.export_to_pem(private_key=True, password=None),
        password=None,
    )

    protected = {
        "alg": "RS256",
        "nonce": nonce_headers["Replay-Nonce"],
        "url": directory["newAccount"],
        "jwk": json.loads(key.export(private_key=False)),
    }
    payload = {"termsOfServiceAgreed": True}
    protected64 = _b64(json.dumps(protected).encode("utf8"))
    payload64 = _b64(json.dumps(payload).encode("utf8"))
    signature = private_key.sign(
        f"{protected64}.{payload64}".encode("utf8"),
        cryptography.hazmat.primitives.asymmetric.padding.PKCS1v15(),
        cryptography.hazmat.primitives.hashes.SHA256(),
    )
    data = json.dumps(
        {
            "protected": protected64,
            "payload": payload64,
            "signature": _b64(signature),
        },
    ).encode("utf8")
    _, account_headers = _request(
        directory["newAccount"],
        data,
        {"Content-Type": "application/jose+json"},
    )

    # The renewal action expects the same JSON files used by stored production account secrets.
    with open(private_key_out, "w") as private_key_file:
        json.dump(json.loads(key.export(private_key=True)), private_key_file)
    with open(registration_out, "w") as registration_file:
        json.dump({"uri": account_headers["Location"]}, registration_file)


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory-url", default=DEFAULT_DIRECTORY_URL)
    parser.add_argument("--private-key-out", default="private_key.json")
    parser.add_argument("--registration-out", default="registration.json")
    args = parser.parse_args(argv)

    create_account(args.directory_url, args.private_key_out, args.registration_out)


if __name__ == "__main__":
    main()
