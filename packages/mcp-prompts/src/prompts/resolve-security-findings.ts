import type { CatalogEntry } from "../types.js";

/**
 * GitHub Code Scanning Findings Resolver
 *
 * This prompt guides an AI agent to analyze and resolve CodeQL security findings
 * detected by GitHub Advanced Security on a repository. It provides guidance for
 * fetching findings using the GitHub CLI, prioritizing open issues on a branch,
 * and applying secure, standards-compliant remediations.
 *
 * The agent can automatically retrieve findings, analyze their content, and propose
 * (or directly apply) fixes in the codebase.
 */
export const resolveSecurityFindings: CatalogEntry = {
  category: "security",
  enabled: true,
  id: "resolve-security-findings",
  metadata: {
    description:
      "Analyzes and resolves GitHub CodeQL security findings. Guides the agent to retrieve and fix open code scanning alerts on the main branch using the GitHub CLI.",
    examples: [
      "Fix all open CodeQL findings on the main branch",
      "Resolve only 'external/cwe/cwe-079' findings in the dx repository",
      "Review and suggest safe remediations for CodeQL high-severity alerts",
    ],
    title: "Resolve GitHub Code Scanning Findings",
  },
  prompt: {
    arguments: [
      {
        description:
          "Subset of CodeQL findings or categories to focus on (e.g. CWE, severity, rule id, or file pattern).",
        name: "scope",
        required: false,
      },
    ],
    description:
      "Fetches open GitHub CodeQL findings from the repository and resolves them safely according to secure coding best practices.",
    load: async (args: {
      scope?: string;
    }) => `You are an AI assistant that helps developers and DevOps automatically resolve GitHub CodeQL code scanning findings.

Your goal is to:
1. Retrieve the list of open findings on the **main** branch.
2. Analyze the alerts, focusing on ${args.scope || "all"}.
3. Suggest or apply secure and minimal remediations.
4. Preserve code readability, logic, and maintainability.

---

### 📥 How to fetch Code Scanning findings

Use the GitHub CLI (\`gh\`) to query CodeQL alerts. The following commands retrieve the necessary data:

#### Retrieve open findings on the main branch
This gives you all open alerts with relevant context:
\`\`\`bash
gh api repos/<org>/<repo>/code-scanning/alerts --paginate \\
  --jq '.[] | select(.most_recent_instance.ref == "refs/heads/<discover what is the main branch>" and .state == "open") |
  {id: .number, rule: .rule.name, rule_id: .rule.id, severity: .rule.severity,
   message: .most_recent_instance.message.text,
   file: .most_recent_instance.location.path,
   start_line: .most_recent_instance.location.start_line,
   end_line: .most_recent_instance.location.end_line,
   rule_url: .rule.help_uri}'
\`\`\`
---

### 🧠 Best Practices for Automated Remediation

- Fix all requested findings.
- Use secure, minimal, and maintainable changes.
- Never remove or comment out code to “hide” a vulnerability.
- When in doubt, explain the reasoning behind each fix.

---

### 🧩 Your Tasks

1. Retrieve findings using the commands above.
2. For each alert, inspect the file, line, and message.
3. Apply or suggest a fix that resolves the vulnerability.
4. If applicable, explain in a final resume the rationale for each fix in a concise way.
5. Output your changes as code patches (diffs) or inline suggestions.

---

Focus on clarity, correctness, and compliance with secure coding standards.`,
    name: "resolve-security-findings",
  },
  tags: ["security", "codeql", "github", "remediation"],
};
