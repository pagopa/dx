"""compare subpackage: two-run skill comparison (workspace vs git ref)."""

from .run import (
    CompareError,
    CompareOptions,
    CompareResult,
    HarborRunError,
    check_harbor_cli,
    run_compare,
)
from .sources import SkillSource, derive_globs, is_git_source, parse_skill

__all__ = [
    "SkillSource",
    "derive_globs",
    "is_git_source",
    "parse_skill",
    "CompareError",
    "CompareOptions",
    "CompareResult",
    "HarborRunError",
    "check_harbor_cli",
    "run_compare",
]
