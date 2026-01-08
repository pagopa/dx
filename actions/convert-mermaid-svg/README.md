# Convert Mermaid Diagrams to SVG

This GitHub Action converts Mermaid diagrams into SVG images using the official Mermaid CLI (`@mermaid-js/mermaid-cli`, aka `mmdc`).

Use this action to automatically render Mermaid code blocks into SVG.

> [!NOTE]
> If a Markdown file is passed as input, the action will modify the file in-place, embedding the generated SVG images directly into the Markdown file, whereas if a `.mmd` file is passed, a standalone `.svg` file will be created.

## Features

- Automatically detects Mermaid code blocks (` ```mermaid `) in Markdown files
- Skips execution if no Mermaid diagrams are found (saves CI time)
- Renders diagrams with dark theme and transparent background
- For `.md` files: Embeds SVG images directly into the original Markdown file
- For `.mmd` files: Creates standalone `.svg` files (e.g., `diagram.mmd` → `diagram.svg`)

## Inputs

- `file_path` (required): Path to the Markdown file (for example: `docs/README.md`) or Mermaid diagram (`.mmd`) file to process

## Example workflow

```yaml
name: Render Mermaid diagrams

on:
  push:
    paths:
      - 'docs/**/*.md'
      - 'README.md'

jobs:
  mermaid:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Convert Mermaid to SVG
        uses: pagopa/dx/actions/convert-mermaid-svg@main
        with:
          file_path: 'docs/architecture.md'

      - name: Commit changes
        ...
```

## Notes

- The action modifies the input Markdown file in-place, embedding SVG images where Mermaid code blocks were found
- Generated SVGs use dark theme (`-t dark`) and transparent background (`-b transparent`)
- The action uses Puppeteer with `--no-sandbox` flag for compatibility with CI environments
