"""Unit tests for harbor/environment.toml loading and validation."""

from __future__ import annotations

from pathlib import Path

import pytest

from harbor_bench.convert.environment_overrides import (
    EnvironmentOverridesError,
    load_environment_overrides,
)


def write_overrides(tmp_path: Path, text: str) -> Path:
    path = tmp_path / "environment.toml"
    path.write_text(text)
    return path


def test_missing_file_raises_os_error(tmp_path: Path):
    with pytest.raises(OSError):
        load_environment_overrides(tmp_path / "nope.toml")


def test_invalid_toml_raises(tmp_path: Path):
    path = write_overrides(tmp_path, "[environment\nbroken")
    with pytest.raises(EnvironmentOverridesError, match="invalid TOML"):
        load_environment_overrides(path)


def test_unknown_top_level_table_rejected(tmp_path: Path):
    path = write_overrides(tmp_path, "[agent]\ntimeout_sec = 1\n")
    with pytest.raises(EnvironmentOverridesError, match="unknown top-level key"):
        load_environment_overrides(path)


def test_empty_environment_is_noop(tmp_path: Path):
    path = write_overrides(tmp_path, "[environment]\n")
    assert load_environment_overrides(path) == {"environment": {}}


def test_stdio_server_with_env_and_hosts(tmp_path: Path):
    path = write_overrides(
        tmp_path,
        """
[environment]
network_mode = "public"
env = { ATLASSIAN_MCP_AUTH = "${ATLASSIAN_MCP_AUTH}" }

[[environment.mcp_servers]]
name = "atlassian"
transport = "stdio"
command = "bash"
args = ["-lc", "echo ${ATLASSIAN_MCP_AUTH}"]
""",
    )
    overrides = load_environment_overrides(path)
    assert overrides == {
        "environment": {
            "network_mode": "public",
            "env": {"ATLASSIAN_MCP_AUTH": "${ATLASSIAN_MCP_AUTH}"},
            "mcp_servers": [
                {
                    "name": "atlassian",
                    "transport": "stdio",
                    "command": "bash",
                    "args": ["-lc", "echo ${ATLASSIAN_MCP_AUTH}"],
                }
            ],
        }
    }


def test_http_transport_is_normalized(tmp_path: Path):
    path = write_overrides(
        tmp_path,
        """
[environment]
[[environment.mcp_servers]]
name = "remote"
transport = "http"
url = "https://example.com/mcp"
""",
    )
    overrides = load_environment_overrides(path)
    server = overrides["environment"]["mcp_servers"][0]
    assert server["transport"] == "streamable-http"
    assert server["url"] == "https://example.com/mcp"


def test_allowed_hosts_requires_allowlist(tmp_path: Path):
    path = write_overrides(
        tmp_path,
        """
[environment]
network_mode = "public"
allowed_hosts = ["example.com"]
""",
    )
    with pytest.raises(EnvironmentOverridesError, match="allowed_hosts"):
        load_environment_overrides(path)


def test_allowlist_with_hosts_ok(tmp_path: Path):
    path = write_overrides(
        tmp_path,
        """
[environment]
network_mode = "allowlist"
allowed_hosts = ["mcp.atlassian.com", "registry.npmjs.org"]
""",
    )
    overrides = load_environment_overrides(path)
    assert overrides["environment"]["allowed_hosts"] == [
        "mcp.atlassian.com",
        "registry.npmjs.org",
    ]


def test_unknown_network_mode_rejected(tmp_path: Path):
    path = write_overrides(tmp_path, '[environment]\nnetwork_mode = "full"\n')
    with pytest.raises(EnvironmentOverridesError, match="network_mode"):
        load_environment_overrides(path)


def test_stdio_server_requires_command(tmp_path: Path):
    path = write_overrides(
        tmp_path,
        """
[environment]
[[environment.mcp_servers]]
name = "broken"
transport = "stdio"
""",
    )
    with pytest.raises(EnvironmentOverridesError, match="command is required"):
        load_environment_overrides(path)


def test_http_server_requires_url(tmp_path: Path):
    path = write_overrides(
        tmp_path,
        """
[environment]
[[environment.mcp_servers]]
name = "broken"
transport = "sse"
""",
    )
    with pytest.raises(EnvironmentOverridesError, match="url is required"):
        load_environment_overrides(path)


def test_unknown_environment_key_rejected(tmp_path: Path):
    path = write_overrides(tmp_path, '[environment]\ncpus = 2\n')
    with pytest.raises(EnvironmentOverridesError, match="unknown \\[environment\\] key"):
        load_environment_overrides(path)


def test_unknown_mcp_server_key_rejected(tmp_path: Path):
    path = write_overrides(
        tmp_path,
        """
[environment]
[[environment.mcp_servers]]
name = "s"
transport = "stdio"
command = "echo"
headers = { A = "b" }
""",
    )
    with pytest.raises(EnvironmentOverridesError, match="unknown \\[environment\\]\\.mcp_servers\\[0\\] key"):
        load_environment_overrides(path)
