"""The one owner of a generated Task's shape.

Both sides of a benchmark run cross this seam:

* the **writer** (``harbor_bench.convert``) generates a Task directory whose
  ``task.toml`` declares which artifacts Harbor collects and how the verifier
  reaches the judge, and whose templates embed the artifact locations;
* the **reader** (``harbor_bench.jobs``) reads those collected artifacts back
  out of a trial subdirectory.

Every artifact location is declared here once, in the coordinate system
Harbor's containers see (``/logs/...``, ``/workspace``). The trial-directory
coordinates the reader needs are derived (:func:`trial_relative`), never
re-declared; the generated templates receive the container coordinates as
``{{PLACEHOLDER}}`` parameters (:func:`render_template`). Moving an artifact
is now one edit, and a writer/reader mismatch fails loudly instead of
silently yielding ``None``.
"""

from __future__ import annotations

#: The two Copilot CLI artifact relative names are owned by the agent-side
#: package (they describe what a Copilot CLI session writes under its log
#: dir); re-exported here so the full container paths and template
#: placeholders below stay derived from a single declaration.
from harbor_copilot.copilot_usage import COPILOT_CLI_JSONL_REL, COPILOT_SESSION_DB_REL

#: The prefix Harbor drops when re-materializing collected artifacts under each
#: trial subdirectory: ``/logs/agent/copilot-cli.jsonl`` lands at
#: ``agent/copilot-cli.jsonl``. ``result.json`` is written by Harbor itself at
#: the trial root and is not derived here.
TRIAL_PREFIX = "/logs"

# --- Container paths (what a running Task's container sees) ---

#: The fixture workspace directory inside the agent container.
WORKSPACE_DIR = "/workspace"

#: The workspace snapshot artifact collected for the judge; the git baseline is
#: excluded (seeded by the Dockerfile's ``git init`` commit) so the snapshot
#: stays lean — the judge reads the workspace packet, never the repo metadata.
WORKSPACE_ARTIFACT: dict = {"source": WORKSPACE_DIR, "exclude": [".git"]}

AGENT_LOG_DIR = "/logs/agent"
VERIFIER_LOG_DIR = "/logs/verifier"
ARTIFACT_DIR = "/logs/artifacts"

COPILOT_SESSION_DB = f"{AGENT_LOG_DIR}/{COPILOT_SESSION_DB_REL}"
COPILOT_CLI_JSONL = f"{AGENT_LOG_DIR}/{COPILOT_CLI_JSONL_REL}"
TRAJECTORY_JSON = f"{AGENT_LOG_DIR}/trajectory.json"
VERIFIER_USAGE_JSONL = f"{VERIFIER_LOG_DIR}/usage.jsonl"
REWARD_JSON = f"{VERIFIER_LOG_DIR}/reward.json"
REWARD_TXT = f"{VERIFIER_LOG_DIR}/reward.txt"
REWARD_DETAILS_JSON = f"{VERIFIER_LOG_DIR}/reward-details.json"
WORKSPACE_PACKET_MD = f"{ARTIFACT_DIR}/workspace-packet.md"

#: Harbor writes the trial's ``result.json`` at the trial root; it is not a
#: collected artifact and has no container path.
RESULT_JSON = "result.json"

#: The ``task.toml`` ``[artifacts]`` declaration for a separate verifier: the
#: workspace snapshot plus the agent log artifacts the report reads back. This
#: is the exact list Harbor must transfer for ``harbor_bench.jobs`` to read a
#: trial, so the writer emits it verbatim.
HARBOR_ARTIFACTS: tuple = (
    WORKSPACE_ARTIFACT,
    COPILOT_CLI_JSONL,
    TRAJECTORY_JSON,
)

#: Judge-bridge env written into ``[verifier].env``: route GitHub Copilot
#: through LiteLLM's ``openai`` provider so the judge can run headless with
#: COPILOT_GITHUB_TOKEN as the key. gpt-5.x models are Responses-API-only, so
#: LITELLM_ROUTE_ALL_CHAT_OPENAI_TO_RESPONSES sends all openai/* judge calls
#: to https://api.githubcopilot.com/responses.
JUDGE_BRIDGE_ENV: dict = {
    "OPENAI_API_BASE": "https://api.githubcopilot.com",
    "OPENAI_API_KEY": "${COPILOT_GITHUB_TOKEN}",
    "LITELLM_DROP_PARAMS": "true",
    "LITELLM_ROUTE_ALL_CHAT_OPENAI_TO_RESPONSES": "true",
}

def trial_relative(container_path: str) -> str:
    """The trial-directory relative path of a container artifact path.

    Harbor re-materializes collected artifacts under each trial subdirectory
    with the ``/logs`` prefix dropped: ``/logs/agent/trajectory.json`` lands
    at ``agent/trajectory.json``. Raise ``ValueError`` for a path outside
    ``/logs``, which has no trial-directory counterpart.
    """
    prefix = TRIAL_PREFIX + "/"
    if container_path.startswith(prefix):
        return container_path[len(prefix) :]
    raise ValueError(
        f"{container_path!r} has no trial-directory path "
        "(only /logs artifacts are re-materialized)"
    )


#: Placeholder substitutions every generated template receives: the task
#: shape's container paths, so a template never hardcodes an artifact
#: location. ``{{BASE_IMAGE}}`` and the per-file values (``{{SKILL_NAME}}``,
#: ``{{JUDGE_MODEL}}``, ``{{TASK_NAME}}``, …) are supplied by the callers.
TEMPLATE_PLACEHOLDERS: dict[str, str] = {
    "WORKSPACE_DIR": WORKSPACE_DIR,
    "AGENT_LOG_DIR": AGENT_LOG_DIR,
    "VERIFIER_LOG_DIR": VERIFIER_LOG_DIR,
    "ARTIFACT_DIR": ARTIFACT_DIR,
    "COPILOT_SESSION_DB": COPILOT_SESSION_DB,
    "COPILOT_CLI_JSONL": COPILOT_CLI_JSONL,
    "TRAJECTORY_JSON": TRAJECTORY_JSON,
    "VERIFIER_USAGE_JSONL": VERIFIER_USAGE_JSONL,
    "REWARD_JSON": REWARD_JSON,
    "REWARD_TXT": REWARD_TXT,
    "REWARD_DETAILS_JSON": REWARD_DETAILS_JSON,
    "WORKSPACE_PACKET_MD": WORKSPACE_PACKET_MD,
}


def render_template(template: str, **placeholders: str) -> str:
    """Substitute ``{{KEY}}`` placeholders in a generated template.

    The task-shape paths (:data:`TEMPLATE_PLACEHOLDERS`) are always available;
    callers add per-file values. ``render_template`` is the only way a
    template references the shape, so a path move is a single edit here.
    """
    merged = {**TEMPLATE_PLACEHOLDERS, **placeholders}
    for key, value in merged.items():
        template = template.replace("{{" + key + "}}", str(value))
    return template
