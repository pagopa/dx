FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5

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
