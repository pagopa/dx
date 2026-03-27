FROM node:22-alpine@sha256:8094c002d08262dba12645a3b4a15cd6cd627d30bc782f53229a2ec13ee22a00 AS base

# Install dependencies only when needed
FROM base AS deps
# libc6-compat is required on Alpine for native Node.js bindings compatibility
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy monorepo root manifests and the app package.json
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dx-metrics/package.json ./apps/dx-metrics/

RUN corepack enable pnpm && pnpm install --frozen-lockfile --filter dx-metrics...

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/dx-metrics/node_modules ./apps/dx-metrics/node_modules
COPY apps/dx-metrics ./apps/dx-metrics
COPY package.json pnpm-workspace.yaml nx.json tsconfig.json ./

ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable pnpm && pnpm nx build dx-metrics

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/apps/dx-metrics/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/dx-metrics/.next/static ./apps/dx-metrics/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/dx-metrics/server.js"]

# Import job runner — uses tsx to execute the TypeScript import script directly.
# Build with: docker build --target import-runner -t ghcr.io/pagopa/dx-metrics-import:latest .
FROM base AS import-runner
WORKDIR /app/apps/dx-metrics

ENV NODE_ENV=production

# Expose tsx (devDependency) and other binaries from both the workspace root and the app.
ENV PATH="/app/node_modules/.bin:/app/apps/dx-metrics/node_modules/.bin:${PATH}"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 importuser

# Copy only the files the import script needs.
COPY --from=deps --chown=importuser:nodejs /app/node_modules /app/node_modules
COPY --from=deps --chown=importuser:nodejs /app/apps/dx-metrics/node_modules ./node_modules

# scripts/ contains the import orchestrator and all importers.
COPY --chown=importuser:nodejs apps/dx-metrics/scripts ./scripts

# src/db/schema.ts is the only src file imported by the import scripts.
COPY --chown=importuser:nodejs apps/dx-metrics/src/db/schema.ts ./src/db/schema.ts

# Runtime configuration and TypeScript settings.
COPY --chown=importuser:nodejs apps/dx-metrics/config.json ./config.json
COPY --chown=importuser:nodejs apps/dx-metrics/tsconfig.json ./tsconfig.json
COPY --chown=importuser:nodejs apps/dx-metrics/package.json ./package.json

# Shell entrypoint that computes --since from IMPORT_SINCE_DAYS and runs the import.
COPY --chown=importuser:nodejs apps/dx-metrics/entrypoint.import.sh ./entrypoint.import.sh
RUN chmod +x entrypoint.import.sh

USER importuser

ENTRYPOINT ["./entrypoint.import.sh"]
