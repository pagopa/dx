---
sidebar_label: Conventional Comments
sidebar_position: 1
---

# Conventional Comments

Conventional comments provide a standardized way to write comments that are easy
to understand and locate. They make code reviews more efficient by ensuring
feedback is clear and consistent.  
Using conventional comments helps make your comments easier to read and search
for, improving collaboration.

## Why Use Conventional Comments?

- **Clarity**: They provide a clear structure for comments, making it easier for
  others to understand your feedback
- **Consistency**: using a standard format helps maintain consistency across
  different code reviews
- **Efficiency**: they make it easier to search for specific types of comments,
  improving the efficiency of the review process

We encourage all contributors to adopt conventional comments in their code
reviews to enhance communication and collaboration.  
For more information, visit the
[Conventional Comments website](https://conventionalcomments.org/).

## Format

Conventional comments use specific prefixes to indicate the type of feedback
being given. Here is the generic format of a conventional comment:

```markdown
<label> [decorations]: <subject>

[discussion]
```

- `label`: indicates the type of feedback being given
- `subject`: main content of the comment
- `decorations` (optional): extra decorating labels for the comment, surrounded
  by parentheses and comma-separated (e.g. `(ui, blocking)`)
- `discussion` (optional): contains supporting statements, context, reasoning,
  and anything else to help communicate the “why” and “next steps” for resolving
  the comment

To see the full list of available labels, take a look at the
[Conventional Comments documentation](https://conventionalcomments.org/).

## Best Practices

In addition to the [Code Review Best Practices](index.md#best-practices),
consider the following best practices when using conventional comments:

- leave actionable comments: make sure the author knows what to do next
- use "could" instead of "should" (e.g. “You could consider using a map instead
  of a list” instead of “You should use a map instead of a list”)
