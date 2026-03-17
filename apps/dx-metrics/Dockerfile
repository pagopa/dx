FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
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
COPY package.json pnpm-workspace.yaml ./

ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable pnpm && pnpm --filter dx-metrics build

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
COPY --from=builder --chown=nextjs:nodejs /app/apps/dx-metrics/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/dx-metrics/server.js"]
