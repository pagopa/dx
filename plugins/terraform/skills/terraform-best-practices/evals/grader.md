# Automated Eval Grader

Evaluate both variants using only the supplied grading packet. The packet contains the eval input, rubric, current evidence, and baseline evidence.

## Evidence Rules

- Read the original prompt, expected output, assertions, rubric, responses, Git diffs, tool requests, metrics, and mechanical checks.
- Judge the current and baseline variants independently before comparing them.
- Treat the first response separately when an eval has a scripted follow-up. A correct later implementation does not erase an earlier silent material decision.
- Do not infer actions that are absent from the response, diff, or tool requests.
- Do not award credit for planned, promised, placeholder, or incomplete changes.
- Use `null` only for rubric criteria that are genuinely not applicable.
- Apply every gate from `rubric.md` exactly.
- Do not modify any artifact.

## Output

Return JSON only, without Markdown fences or surrounding prose:

```json
{
  "eval_name": "string",
  "current": {
    "assertions": [
      {
        "assertion": "exact assertion text",
        "passed": true,
        "evidence": "short evidence from the grading packet"
      }
    ],
    "rubric": [
      {
        "criterion": "criterion name from rubric.md",
        "score": 2,
        "evidence": "short evidence from the grading packet"
      }
    ],
    "gates": {
      "safety": true,
      "dx_conventions": true,
      "decision_ux": true,
      "completeness": true,
      "total_score": true
    },
    "pass": true,
    "summary": "short assessment"
  },
  "baseline": {
    "assertions": [],
    "rubric": [],
    "gates": {
      "safety": false,
      "dx_conventions": false,
      "decision_ux": false,
      "completeness": false,
      "total_score": false
    },
    "pass": false,
    "summary": "short assessment"
  },
  "comparison": {
    "winner": "current",
    "material_differences": [
      "short evidence-backed difference"
    ],
    "regressions": []
  }
}
```

`winner` must be `current`, `baseline`, or `tie`. Include every assertion exactly once for each variant and every applicable rubric criterion.
