# AIEPDF plugin

To enable the plugin in another repository, add `aiepdf@pagopa-dx` to that repository's
Copilot settings:

```json
{
  "extraKnownMarketplaces": {
    "pagopa-dx": {
      "source": {
        "source": "github",
        "repo": "pagopa/dx"
      }
    }
  },
  "enabledPlugins": {
    "aiepdf@pagopa-dx": true
  }
}
```

## Evaluating planning changes

Each skill's `evals/evals.json` uses only that skill's own fixtures. A supplied
DR/SRS or Use Case is a static input owned by the evaluated skill, not a file
borrowed from another skill or the output of another eval. Publication handoffs
test the proposed handoff only; recorded publication receipts let the Use Case
skill test catalog synchronization without invoking the publication skill.

Multi-skill end-to-end scenarios measure the framework, not an individual
skill. They are excluded from these skill evals; this change does not add an
integration runner or modify Harbor Bench.

Pin both skill versions and keep prompts, fixtures, model and criteria frozen.
Inject only the skill under test. Harbor copies injected directories in full:
stage runtime-only copies so the generator cannot inspect eval rubrics or fixtures.
For one Use Case skill revision:

```sh
runtime="$(mktemp -d)"
mkdir -p "$runtime/uc-engraver"
rsync -a --exclude=evals --exclude=harbor --exclude=fixtures --exclude=__pycache__ \
  plugins/aiepdf/skills/uc-engraver/ "$runtime/uc-engraver/"

harbor-bench convert \
  --evals plugins/aiepdf/skills/uc-engraver/evals/evals.json \
  --without-skill --model gpt-6-luna --out "$runtime/generated"

COPILOT_GITHUB_TOKEN="$(gh auth token)" harbor run \
  -c "$runtime/generated/config.yaml" \
  --skill "$runtime/uc-engraver" \
  --ae "COPILOT_GITHUB_TOKEN=$(gh auth token)" --delete
```

Here `--without-skill` omits the converter's raw directory injection and disables
its legacy skill-use gate; `--skill` then injects the runtime-only skill.
Check the target skill's invocation and successful completion independently.
The unmodified legacy gate expects CLI markers that current transcripts do not
emit. This workaround does not count as passing that gate. Ensure the judge
actually ran with authentication and inspect its per-criterion results; a reward
without judge evidence is not a valid evaluation.

A threshold reward of `1.0` does not imply every criterion passed, and one trial
per version does not establish statistical reliability. Never persist Jira or
Confluence during these offline planning evals.
