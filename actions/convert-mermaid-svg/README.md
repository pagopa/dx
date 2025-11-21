# Convert Mermaid Diagrams to SVG

This GitHub Action converts Mermaid diagrams inside Markdown files into SVG images using the official Mermaid CLI (`@mermaid-js/mermaid-cli`, aka `mmdc`).

Use this action to automatically render Mermaid code blocks into SVG when you commit documentation, README files, or other Markdown content that contains diagrams.

## Features

- Automatically detects Mermaid code blocks (` ```mermaid `) in Markdown files
- Skips execution if no Mermaid diagrams are found (saves CI time)
- Renders diagrams with dark theme and transparent background
- Embeds SVG images directly into the original Markdown file

## Inputs

- `file_path` (required): Path to the Markdown file to process (for example: `docs/README.md`)

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
