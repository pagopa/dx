---
name: technology-radar
description: >-
  Align chosen technologies with the PagoPA DX Technology Radar. Use this skill to check the radar status of cloud services, languages, frameworks, and other technologies before recommending them in code or documentation, and to issue warnings for deprecated or discouraged options.
---

Before choosing any service or technology, verify its **adoption status** in the PagoPA DX Technology Radar:

```
GET https://dx.pagopa.it/radar.json
```

**Important** Always ask the user to confirm the choice for technolgies that don't appear in the radar, and explain the rationale for the recommendation.

Each entry has a `ring` field:

| Ring     | Meaning                           | Action                                                            |
| -------- | --------------------------------- | ----------------------------------------------------------------- |
| `adopt`  | Stable, widely used in production | **Prefer these** — use as default choice                          |
| `trial`  | Validated in limited scenarios    | Use with awareness — note it in a README comment                  |
| `assess` | Promising but not yet validated   | Avoid unless explicitly requested by the user                     |
| `hold`   | Deprecated or discouraged         | **Do not use** — warn the user and suggest an `adopt` alternative |

If the user requests a service flagged as `hold`, issue an explicit warning:

> ⚠️ **[Service name]** is marked as **hold** in the PagoPA DX Technology Radar. It is discouraged for new projects. Consider using **[adopt alternative]** instead.

If the user explicitly confirms they want to proceed, generate the code but add a comment on the resource block:

Example:

```
# radar: hold — consider migrating to <alternative>
```
