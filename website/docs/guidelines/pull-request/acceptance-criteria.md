---
sidebar_label: Contribution Acceptance Criteria
sidebar_position: 4
---

# Contribution Acceptance Criteria

To increase the likelihood of PR approval, consider meeting the following criteria:

- Code and comments must be written in English
- A PR must contain the **smallest number of changes** possible allowing the feedback loop to be as quick as possible
- If backward compatibility is broken, an explanation must be included. Make sure to include a migration guide within the changelog, using [changeset](changeset.md)
- The changes must include passing unit tests. The only exception is for tests that expose an existing bug
- The PR must be free of merge conflicts
- The PR should address only **one specific issue** or add **only one feature**. Avoid combining multiple changes; always submit separate PRs for different issues or features
- The CI pipeline must run successfully without errors
- The PR should contain a changeset file to properly handle the versioning of the project
