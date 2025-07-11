---
"@pagopa/dx-cli": patch
---

Enhance CLI code

Move some objects (and decoder) to the domain layer.
Simplify assertions in the unit tests
Extract a readFile function to favor reuse
Set `node` engine minimum version to 22: we are using some new API introduced in Node v22
