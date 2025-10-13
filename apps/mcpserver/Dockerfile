FROM public.ecr.aws/docker/library/node:slim AS base

# 1. Enable pnpm
RUN corepack enable

# 2. Set working directory
WORKDIR /app

# 3. Copy monorepo configuration files
COPY ./pnpm-lock.yaml ./pnpm-workspace.yaml ./package.json ./

# 4. Copy source code for apps and packages
COPY ./apps ./apps
COPY ./packages ./packages


# 5. Install ALL dependencies for mcpserver and its workspace dependencies
RUN pnpm install --filter @pagopa/dx-mcpserver...
# 6. Build the mcpserver app
RUN pnpm --filter @pagopa/dx-mcpserver build
# 7. Prune development-only dependencies for the final image
RUN pnpm --filter @pagopa/dx-mcpserver deploy --legacy --prod /app/deploy


# --- Final Image ---
FROM public.ecr.aws/docker/library/node:slim
WORKDIR /app

# Copy the AWS Lambda Adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter

# Copy the pruned production-ready files from the build stage
COPY --from=base /app/deploy .

EXPOSE 8080
CMD ["node", "dist/index.js"]
