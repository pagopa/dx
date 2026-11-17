FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.json ./
COPY .pnpmfile.cjs ./
COPY patches ./patches
COPY apps/dx-metrics-import/package.json ./apps/dx-metrics-import/
COPY packages/dx-metrics-core/package.json ./packages/dx-metrics-core/

# Corepack is no longer bundled with Node.js >= 25, so pnpm is installed
# directly from the version pinned in package.json (`packageManager`).
RUN PNPM_VERSION="$(node -p 'require("./package.json").packageManager.replace(/^pnpm@/, "")')" && \
    npm install -g "pnpm@${PNPM_VERSION}" && \
    pnpm install --frozen-lockfile --filter dx-metrics-import...

COPY apps/dx-metrics-import ./apps/dx-metrics-import
COPY packages/dx-metrics-core ./packages/dx-metrics-core

ENV NODE_ENV=production

WORKDIR /app/apps/dx-metrics-import

RUN npm run build

WORKDIR /app

WORKDIR /app/apps/dx-metrics-import

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 importuser

USER importuser

ENTRYPOINT ["node", "dist/import.mjs"]
