FROM node:26-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.json ./
COPY apps/dx-metrics-import/package.json ./apps/dx-metrics-import/
COPY packages/dx-metrics-core/package.json ./packages/dx-metrics-core/

RUN corepack enable && corepack install && \
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
