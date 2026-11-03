"""Temporary dispatch proof of restricted App tokens and real TFLint downloads."""

import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request


VERSION = "0.27.0"
RELEASE = (
    "/repos/terraform-linters/tflint-ruleset-azurerm/releases/tags/v" + VERSION
)


def required(name):
    value = os.environ.get(name)
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def request(path, token=None, method="GET", body=None, expected=(200,)):
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "pagopa-dx-restricted-app-token-smoke",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        headers["Content-Type"] = "application/json"
    api = os.environ.get("GITHUB_API_URL", "https://api.github.com")
    req = urllib.request.Request(
        api + path,
        headers=headers,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
    )
    try:
        response = urllib.request.urlopen(req, timeout=60)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        status = response.getcode()
        payload = response.read()
        data = json.loads(payload) if payload else None
        rate = {
            key: response.headers.get("X-RateLimit-" + key.capitalize())
            for key in ("limit", "remaining", "reset", "resource")
        }
    if status not in expected:
        message = data.get("message", "") if isinstance(data, dict) else ""
        raise RuntimeError(f"GitHub {method} {path}: HTTP {status}: {message}")
    return data, rate, status


def save(name, value):
    destination = Path(required("SMOKE_RESULTS"))
    destination.mkdir(parents=True, exist_ok=True)
    (destination / name).write_text(json.dumps(value, indent=2) + "\n")


def encoded(value):
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


def redacted(value):
    for name in ("GH_APP_KEY", "DEPS_TOKEN"):
        secret = os.environ.get(name)
        if secret:
            value = value.replace(secret, "<redacted-secret>")
    return re.sub(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", "<redacted-ip>", value)


def app_jwt():
    issued = int(time.time())
    header = encoded(b'{"alg":"RS256","typ":"JWT"}')
    claims = encoded(
        json.dumps(
            {
                "iss": required("GH_APP_CLIENT_ID"),
                "iat": issued - 60,
                "exp": issued + 540,
            },
            separators=(",", ":"),
        ).encode()
    )
    message = f"{header}.{claims}"
    with tempfile.NamedTemporaryFile(mode="w", suffix=".pem") as private_key:
        private_key.write(required("GH_APP_KEY").replace("\\n", "\n"))
        private_key.flush()
        signature = subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", private_key.name],
            input=message.encode(),
            capture_output=True,
            check=True,
        ).stdout
    return message + "." + encoded(signature)


def mint():
    permission = required("APP_TOKEN_PERMISSION")
    if permission not in ("contents", "metadata"):
        raise ValueError("Unexpected permission profile")
    repository = required("GITHUB_REPOSITORY")
    owner, name = repository.split("/")
    jwt = app_jwt()
    installation, _, _ = request(
        f"/repos/{owner}/{name}/installation", jwt
    )
    if not isinstance(installation, dict) or not isinstance(
        installation.get("id"), int
    ):
        raise ValueError("Missing installation ID in GitHub response")
    issued, _, _ = request(
        f"/app/installations/{installation['id']}/access_tokens",
        jwt,
        method="POST",
        body={"repositories": [name], "permissions": {permission: "read"}},
        expected=(201,),
    )
    if not isinstance(issued, dict):
        raise ValueError("Invalid token issuance response")
    token = issued.get("token")
    if not isinstance(token, str) or not token or "\n" in token or "\r" in token:
        raise ValueError("Invalid installation token in GitHub response")
    print(f"::add-mask::{token}", flush=True)
    published = False
    try:
        expected = {"metadata": "read"}
        if permission == "contents":
            expected["contents"] = "read"
        if issued.get("permissions") != expected:
            raise ValueError("Effective token permissions differ from requested profile")
        repositories = issued.get("repositories")
        if (
            not isinstance(repositories, list)
            or len(repositories) != 1
            or repositories[0].get("full_name") != repository
        ):
            raise ValueError("Token repository scope is not the current repository only")
        save(
            "permissions.json",
            {
                "profile": permission,
                "permissions": issued["permissions"],
                "repositories": [repository],
                "expires_at": issued.get("expires_at"),
            },
        )
        with Path(required("GITHUB_OUTPUT")).open("a") as output:
            output.write(f"token={token}\n")
        published = True
        print(f"Effective permissions: {json.dumps(expected, sort_keys=True)}")
        print(f"Repository scope: {repository}")
    finally:
        if not published:
            request("/installation/token", token, method="DELETE", expected=(204,))


def command(arguments, environment, log_name):
    result = subprocess.run(
        arguments, env=environment, capture_output=True, text=True, timeout=180
    )
    output = redacted(result.stdout + result.stderr)
    (Path(required("SMOKE_RESULTS")) / log_name).write_text(output)
    print(output, end="")
    if result.returncode:
        raise RuntimeError(f"{arguments[0]} {arguments[1]} exited {result.returncode}")
    return output


def download():
    if os.environ.get("GH_APP_KEY"):
        raise RuntimeError("App private key must not be passed to the download step")
    token = required("DEPS_TOKEN")
    release, before, _ = request(RELEASE, token)
    if not isinstance(release, dict) or release.get("tag_name") != "v" + VERSION:
        raise ValueError("Unexpected release metadata")
    if int(before.get("limit") or 0) <= 60:
        raise ValueError("Release request did not receive an authenticated quota")
    report = {
        "profile": required("APP_TOKEN_PERMISSION"),
        "release_http_status": 200,
        "rate_before": before,
        "downloads": [],
    }
    try:
        for attempt in range(1, 4):
            with tempfile.TemporaryDirectory(prefix="app-token-tflint-") as directory:
                plugins = Path(directory) / "plugins"
                environment = {
                    key: value
                    for key, value in os.environ.items()
                    if key not in ("GH_TOKEN", "MISE_GITHUB_TOKEN", "DEPS_TOKEN")
                }
                environment["GITHUB_TOKEN"] = token
                environment["TFLINT_PLUGIN_DIR"] = str(plugins)
                started = time.monotonic()
                command(["tflint", "--init"], environment, f"download-{attempt}.log")
                binary = (
                    plugins
                    / "github.com/terraform-linters/tflint-ruleset-azurerm"
                    / VERSION
                    / "tflint-ruleset-azurerm"
                )
                if not binary.is_file() or not os.access(binary, os.X_OK):
                    raise ValueError("Downloaded plugin is missing or not executable")
                version = command(
                    ["tflint", "--version"], environment, f"version-{attempt}.log"
                )
                if f"azurerm ({VERSION})" not in version:
                    raise ValueError("TFLint did not load the downloaded plugin")
                report["downloads"].append(
                    {
                        "attempt": attempt,
                        "seconds": round(time.monotonic() - started, 3),
                        "sha256": hashlib.sha256(binary.read_bytes()).hexdigest(),
                        "plugin_loaded": True,
                    }
                )
        _, after, _ = request(RELEASE, token)
        report["rate_after"] = after
        if len({item["sha256"] for item in report["downloads"]}) != 1:
            raise ValueError("Cold-cache downloads produced different binaries")
        print("Three real cold-cache downloads succeeded and the plugin loaded each time.")
    finally:
        save("downloads.json", report)
        print(json.dumps(report, indent=2))


def revoke():
    token = required("DEPS_TOKEN")
    _, _, status = request(
        "/installation/token", token, method="DELETE", expected=(204,)
    )
    _, _, rejected = request(
        "/installation/repositories", token, expected=(401,)
    )
    save("revocation.json", {"revoke_http_status": status, "reuse_http_status": rejected})
    print("Token revoked: HTTP 204; reuse rejected: HTTP 401.")


def main():
    operations = {"mint": mint, "download": download, "revoke": revoke}
    if len(sys.argv) != 2 or sys.argv[1] not in operations:
        raise ValueError("Expected mint, download, or revoke")
    operation = sys.argv[1]
    try:
        operations[operation]()
    except Exception as error:
        save(
            operation + "-error.json",
            {
                "operation": operation,
                "error_type": type(error).__name__,
                "error": redacted(str(error)),
            },
        )
        raise


if __name__ == "__main__":
    main()
