---
"pr-comment-action": minor
---

Upgrade `@actions/core` from `^1.11.1` to `^3.0.0` and `@actions/github` from `^6.0.0` to `^9.0.0`.

Also fixed a pre-existing bug in the test suite where `toHaveBeenCalledWith()` was called without arguments, causing a false assertion in the "should handle comment deletion errors gracefully" test case.
