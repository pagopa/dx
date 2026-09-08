"""Load and validate a skill's ``harbor/environment.toml``.

The optional per-skill file declares ``[environment]`` overrides — MCP servers,
env-var templates, network policy — in the same shape Harbor's task ``task.toml``
``[environment]`` table accepts. ``convert`` deep-merges the result into every
generated task of the skill, on top of the converter defaults. ``evals.json``
stays the source of truth for the eval cases; this file is the skill-owned
harness configuration (what the agent container needs beyond the fixture
workspace).

Validation fails fast at plan time (never writes): the accepted surface mirrors
the ``EnvironmentConfig`` fields the converter may override. ``${VAR}`` env
templates are kept literal — Harbor resolves them from the host environment at
run time, so secrets never land in the generated tasks or the repo.
"""

from __future__ import annotations

import tomllib
from pathlib import Path

#: Top-level TOML tables the skill file may declare. Only ``[environment]`` is
#: supported today; the converter merges it over ``DEFAULT_TASK_TOML``'s own
#: ``[environment]`` skeleton.
ALLOWED_TABLES = ("environment",)

#: Keys accepted inside ``[environment]`` (subset of Harbor's EnvironmentConfig
#: that makes sense per skill; other fields stay converter-owned).
ENVIRONMENT_KEYS = ("network_mode", "allowed_hosts", "mcp_servers", "env")

#: NetworkMode values accepted by Harbor 0.22.0 (harbor.models.task.config).
SUPPORTED_NETWORK_MODES = ("public", "allowlist", "no-network")

#: MCP transports accepted by Harbor's MCPServerConfig; ``http`` is a legacy
#: alias for ``streamable-http`` normalized here.
MCP_TRANSPORTS = ("stdio", "sse", "streamable-http", "http")

#: Fields accepted on one MCP server (Harbor's MCPServerConfig surface).
MCP_SERVER_KEYS = ("name", "transport", "url", "command", "args")


class EnvironmentOverridesError(ValueError):
    """A malformed ``harbor/environment.toml`` (caught at plan time)."""


def _table(path: Path) -> dict:
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as exc:
        raise EnvironmentOverridesError(
            f"{path.name}: invalid TOML: {exc}"
        ) from exc
    if not isinstance(data, dict):
        raise EnvironmentOverridesError(
            f"{path.name}: expected a TOML table, got {type(data).__name__}"
        )
    return data


def _check_keys(path: Path, mapping: dict, allowed: tuple[str, ...], where: str) -> None:
    unknown = sorted(set(mapping) - set(allowed))
    if unknown:
        raise EnvironmentOverridesError(
            f"{path.name}: unknown {where} key(s) {', '.join(unknown)!r}; "
            f"allowed: {', '.join(allowed)}"
        )


def _validate_environment(path: Path, value: object) -> dict:
    if not isinstance(value, dict):
        raise EnvironmentOverridesError(
            f"{path.name}: [environment] must be a table, got {type(value).__name__}"
        )
    _check_keys(path, value, ENVIRONMENT_KEYS, "[environment]")

    network_mode = value.get("network_mode")
    if network_mode is not None and network_mode not in SUPPORTED_NETWORK_MODES:
        raise EnvironmentOverridesError(
            f"{path.name}: [environment].network_mode must be one of "
            f"{', '.join(SUPPORTED_NETWORK_MODES)}, got {network_mode!r}"
        )

    allowed_hosts = value.get("allowed_hosts")
    if allowed_hosts is not None:
        if not isinstance(allowed_hosts, list) or not all(
            isinstance(host, str) for host in allowed_hosts
        ):
            raise EnvironmentOverridesError(
                f"{path.name}: [environment].allowed_hosts must be a list of hostnames"
            )
        if network_mode != "allowlist":
            raise EnvironmentOverridesError(
                f"{path.name}: [environment].allowed_hosts is only valid when "
                "network_mode = \"allowlist\""
            )

    mcp_servers = value.get("mcp_servers")
    if mcp_servers is not None:
        if not isinstance(mcp_servers, list):
            raise EnvironmentOverridesError(
                f"{path.name}: [environment].mcp_servers must be a list"
            )
        for index, server in enumerate(mcp_servers):
            mcp_servers[index] = _validate_mcp_server(path, index, server)

    env = value.get("env")
    if env is not None:
        if not isinstance(env, dict) or not all(
            isinstance(k, str) and isinstance(v, str) for k, v in env.items()
        ):
            raise EnvironmentOverridesError(
                f"{path.name}: [environment].env must be a table of strings "
                '(e.g. ATLASSIAN_MCP_AUTH = "${ATLASSIAN_MCP_AUTH}")'
            )

    return {k: v for k, v in value.items() if v is not None}


def _validate_mcp_server(path: Path, index: int, server: object) -> dict:
    where = f"[environment].mcp_servers[{index}]"
    if not isinstance(server, dict):
        raise EnvironmentOverridesError(
            f"{path.name}: {where} must be a table, got {type(server).__name__}"
        )
    _check_keys(path, server, MCP_SERVER_KEYS, where)

    name = server.get("name")
    if not name or not isinstance(name, str):
        raise EnvironmentOverridesError(f"{path.name}: {where}.name is required")
    transport = server.get("transport")
    if transport not in MCP_TRANSPORTS:
        raise EnvironmentOverridesError(
            f"{path.name}: {where}.transport must be one of "
            f"{', '.join(MCP_TRANSPORTS)}, got {transport!r}"
        )
    if transport == "http":
        transport = "streamable-http"

    cleaned: dict = {"name": name, "transport": transport}
    if transport == "stdio":
        command = server.get("command")
        if not command or not isinstance(command, str):
            raise EnvironmentOverridesError(
                f"{path.name}: {where}.command is required for stdio transport"
            )
        args = server.get("args", [])
        if not isinstance(args, list) or not all(isinstance(a, str) for a in args):
            raise EnvironmentOverridesError(
                f"{path.name}: {where}.args must be a list of strings"
            )
        cleaned["command"] = command
        if args:
            cleaned["args"] = list(args)
    else:
        url = server.get("url")
        if not url or not isinstance(url, str):
            raise EnvironmentOverridesError(
                f"{path.name}: {where}.url is required for '{transport}' transport"
            )
        cleaned["url"] = url
    return cleaned


def load_environment_overrides(path: Path) -> dict:
    """Parse and validate ``harbor/environment.toml`` into an overrides dict.

    The returned dict is shaped for the converter's deep-merge over
    ``DEFAULT_TASK_TOML`` (a single ``"environment"`` key). ``${VAR}`` values
    are preserved verbatim. Raises :class:`EnvironmentOverridesError` (a
    ``ValueError``) for anything the converter cannot represent, so a broken
    file fails the plan before anything is written.
    """
    data = _table(path)
    _check_keys(path, data, ALLOWED_TABLES, "top-level")

    environment = data.get("environment")
    if environment is None:
        raise EnvironmentOverridesError(
            f"{path.name}: expected an [environment] table"
        )
    return {"environment": _validate_environment(path, environment)}
