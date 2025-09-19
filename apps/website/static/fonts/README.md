# PagoPA Local Fonts

This directory contains the font files used by the DX website, downloaded
directly from the official PagoPA website to improve performance and privacy by
avoiding Google Fonts.

## Font Files

### Work Sans

- `work-sans-400.woff2` - Work Sans Regular (400)
- `work-sans-500.woff2` - Work Sans Medium (500)

### Roboto Mono

- `roboto-mono-400.woff2` - Roboto Mono Regular (400)
- `roboto-mono-400-italic.woff2` - Roboto Mono Regular Italic (400)
- `roboto-mono-500.woff2` - Roboto Mono Medium (500)
- `roboto-mono-700.woff2` - Roboto Mono Bold (700)

## Source

These fonts were downloaded from the official PagoPA website
(https://www.pagopa.it/it/) on September 18, 2025, ensuring consistency with the
PagoPA brand typography.

## Usage

The fonts are defined in `/src/css/fonts.css` and automatically included in the
website build. They are served from the `/fonts/` path in the website.

## Benefits

- **Performance**: Local fonts load faster than external Google Fonts
- **Privacy**: No external requests to Google's servers
- **Reliability**: No dependency on external CDN availability
- **Brand Consistency**: Uses the exact same fonts as the official PagoPA
  website

## Maintenance

If PagoPA updates their fonts, these files may need to be updated by downloading
the latest versions from their website.
