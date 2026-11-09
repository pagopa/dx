FROM node:26-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.json ./
COPY apps/dx-metrics/package.json ./apps/dx-metrics/
COPY packages/dx-metrics-core/package.json ./packages/dx-metrics-core/

RUN corepack enable && corepack install && \
    pnpm install --frozen-lockfile --filter dx-metrics...

COPY apps/dx-metrics ./apps/dx-metrics
COPY packages/dx-metrics-core ./packages/dx-metrics-core

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/dx-metrics

RUN npm run build && \
    cp -R /app/apps/dx-metrics/.next/standalone/. /app/

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/dx-metrics/server.js"]
