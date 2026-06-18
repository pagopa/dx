## 0.1.4 (2026-06-18)

### 🩹 Fixes

- Stabilize the DX Metrics importer Docker build by pinning the repository package manager and avoiding Nx workspace resolution inside the image build. ([#1841](https://github.com/pagopa/dx/pull/1841))
- Keep the DX Metrics Docker builds on each package's existing build script so the image build does not re-enter pnpm workspace resolution inside a reduced Docker workspace. ([#1852](https://github.com/pagopa/dx/pull/1852))

### ❤️ Thank You

- Copilot @Copilot
- Danilo Spinelli @gunzip

## 0.1.3 (2026-06-09)

### 🩹 Fixes

- Upgrade dependencies ([#1818](https://github.com/pagopa/dx/pull/1818))
- Upgrade dependencies ([#1818](https://github.com/pagopa/dx/pull/1818))
- Rename tsconfig.app.json to tsconfig.lib.json in order to let NX infer the right build tasks ([#1822](https://github.com/pagopa/dx/pull/1822))

### 🧱 Updated Dependencies

- Updated @pagopa/dx-metrics-core to 0.1.2

### ❤️ Thank You

- Copilot @Copilot
- Danilo Spinelli @gunzip

## 0.1.2 (2026-05-19)

### 🩹 Fixes

- Keep `pg` external in the importer bundle so the job runtime avoids the ESM dynamic require failure. ([#1766](https://github.com/pagopa/dx/pull/1766))

### ❤️ Thank You

- Copilot @Copilot
- Danilo Spinelli @gunzip

## 0.1.1 (2026-05-19)

### 🩹 Fixes

- Create a dedicated DX Metrics importer app ([#1750](https://github.com/pagopa/dx/pull/1750))

### 🧱 Updated Dependencies

- Updated @pagopa/dx-metrics-core to 0.1.1

### ❤️ Thank You

- Copilot @Copilot
- Copilot Autofix powered by AI @Copilot
- Danilo Spinelli @gunzip
