"""Hash the complete review manifest, without printing its contents."""

import argparse
import hashlib
import json
import sys
from pathlib import Path


def unique_object(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON object key in review manifest")
        result[key] = value
    return result


def projection_digest(manifest: dict) -> str:
    if manifest.get("schema") != "jira-projection-review/v1":
        raise ValueError("Unsupported review manifest schema")
    if manifest.get("mode") not in ("backlog", "single-item"):
        raise ValueError("Review mode must be backlog or single-item")
    for name in ("target", "items", "sources", "review"):
        if not isinstance(manifest.get(name), dict) or not manifest[name]:
            raise ValueError(f"Review manifest requires a non-empty {name} object")
    for name in ("relationships", "remote_links"):
        if not isinstance(manifest.get(name), list):
            raise ValueError(f"Review manifest requires a {name} array")
    encoded = json.dumps(
        manifest, sort_keys=True, ensure_ascii=False, separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path, help="Complete Jira review JSON manifest")
    args = parser.parse_args()
    try:
        manifest = json.loads(
            args.manifest.read_text(encoding="utf-8"), object_pairs_hook=unique_object
        )
        if not isinstance(manifest, dict):
            raise ValueError("Review manifest must be a JSON object")
        digest = projection_digest(manifest)
    except (OSError, UnicodeError, ValueError) as error:
        # JSONDecodeError includes source fragments; do not expose those.
        message = "Invalid review manifest JSON" if isinstance(
            error, json.JSONDecodeError
        ) else str(error)
        print(message, file=sys.stderr)
        sys.exit(1)
    print(digest)


if __name__ == "__main__":
    main()
