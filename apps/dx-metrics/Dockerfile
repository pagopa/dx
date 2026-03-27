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

# Bundle the import script into a single JS file
RUN pnpm build:import

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

# Build with: docker build --target import-runner -t ghcr.io/pagopa/dx-metrics-import:latest .
FROM base AS import-runner
WORKDIR /app/apps/dx-metrics

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 importuser

# Copy the bundled import script produced by the builder stage.
COPY --from=builder --chown=importuser:nodejs /app/apps/dx-metrics/dist/import.mjs ./dist/import.mjs

# Runtime npm dependencies (e.g. pg, drizzle-orm, octokit).
COPY --from=deps --chown=importuser:nodejs /app/node_modules /app/node_modules
COPY --from=deps --chown=importuser:nodejs /app/apps/dx-metrics/node_modules ./node_modules

# Runtime configuration.
COPY --chown=importuser:nodejs apps/dx-metrics/config.json ./config.json
COPY --chown=importuser:nodejs apps/dx-metrics/package.json ./package.json

USER importuser

ENTRYPOINT ["node", "dist/import.mjs"]
