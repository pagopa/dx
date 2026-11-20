FROM public.ecr.aws/docker/library/node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS base

# 1. Set working directory
WORKDIR /app

# 2. Copy monorepo configuration files
COPY ./pnpm-lock.yaml ./pnpm-workspace.yaml ./package.json ./nx.json ./tsconfig.json ./
COPY ./.pnpmfile.cjs ./
COPY ./patches ./patches

# 3. Install pnpm with get-pnpm, which resolves the version pinned in
# package.json (`packageManager`); Corepack is no longer bundled with Node.js >= 25
ENV PNPM_HOME=/opt/pnpm
ENV PATH="$PNPM_HOME/bin:$PATH"

RUN npx --yes get-pnpm@latest --no-modify-path

# 4. Copy source code for apps and packages
COPY ./apps ./apps
COPY ./packages ./packages

# 5. Install ALL dependencies for mcpserver and its workspace dependencies
RUN pnpm install --filter @pagopa/dx-mcpserver...
# 6. Build the mcpserver app
RUN pnpm nx build @pagopa/dx-mcpserver
# 7. Prune development-only dependencies for the final image
# Workspace patches target dev-only packages (e.g. nx), which --prod omits.
RUN pnpm --filter @pagopa/dx-mcpserver deploy --legacy --prod --config.allow-unused-patches=true /app/deploy

# --- Final Image ---
FROM public.ecr.aws/docker/library/node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5
WORKDIR /app

# Copy the AWS Lambda Adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.1.0@sha256:17cfd08eff1dfea3f6a9a1e9c65fdac80aa4919b6085e746615530f43f57d2f1 /lambda-adapter /opt/extensions/lambda-adapter

# Copy the pruned production-ready files from the build stage
COPY --from=base /app/deploy .

EXPOSE 8080
CMD ["node", "dist/cli.js"]
