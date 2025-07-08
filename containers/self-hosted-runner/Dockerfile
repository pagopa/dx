FROM ghcr.io/actions/actions-runner:latest@sha256:9c3383600872325f21951a0a1a8ae640361ff5e1abdf1f2900de8ba1cfd915e9 AS base

# === Stage 1: Use base Runner and install tools ===
ARG RUNNER_DIGEST
LABEL base_runner_digest=${RUNNER_DIGEST}

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    zip wget xz-utils && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# === Stage 2: Install Node.js ===
FROM base AS nodejs
ENV NODE_VERSION=20.12.2
RUN curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz | \
    tar -xJ -C /usr/local --strip-components=1 && \
    corepack enable

# === Stage 3: Install Azure CLI ===
FROM nodejs AS azure
RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash

# === Stage 4: Install AWS CLI ===
FROM azure AS aws
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip -q awscliv2.zip && ./aws/install && \
    rm -rf awscliv2.zip aws

# === Stage 5: Cleanup ===
FROM aws AS cleanup

RUN apt-get remove -y xz-utils && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /usr/share/doc/* /usr/share/man/* /var/cache/debconf/* && \
    npm cache clean --force && \
    rm -rf /root/.npm

# === Final Stage ===
FROM cleanup AS final

RUN node --version && \
    npm --version && \
    az --version && \
    aws --version

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER runner

ENTRYPOINT ["/entrypoint.sh"]