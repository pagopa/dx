FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.json ./
COPY .pnpmfile.cjs ./
COPY patches ./patches
COPY apps/dx-metrics-import/package.json ./apps/dx-metrics-import/
COPY packages/dx-metrics-core/package.json ./packages/dx-metrics-core/

# Corepack is no longer bundled with Node.js >= 25, so pnpm is installed with
# get-pnpm, which resolves the version pinned in package.json (`packageManager`).
ENV PNPM_HOME=/opt/pnpm
ENV PATH="$PNPM_HOME/bin:$PATH"

RUN npx --yes get-pnpm@latest --no-modify-path && \
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
