FROM node:22-alpine@sha256:8094c002d08262dba12645a3b4a15cd6cd627d30bc782f53229a2ec13ee22a00

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.json ./
COPY apps/dx-metrics/package.json ./apps/dx-metrics/
COPY packages/dx-metrics-core/package.json ./packages/dx-metrics-core/

RUN corepack enable pnpm && pnpm install --frozen-lockfile --filter dx-metrics...

COPY apps/dx-metrics ./apps/dx-metrics
COPY packages/dx-metrics-core ./packages/dx-metrics-core

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm nx build dx-metrics && \
    cp -R /app/apps/dx-metrics/.next/standalone/. /app/

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/dx-metrics/server.js"]
