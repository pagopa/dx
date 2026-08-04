
# === Stage 1: Use base Runner and install tools ===
ARG RUNNER_DIGEST

FROM ghcr.io/actions/actions-runner${RUNNER_DIGEST:+@${RUNNER_DIGEST}} AS base

ARG RUNNER_DIGEST
ARG MISE_VERSION=2026.8.1
ARG MISE_SHA256=961b1fcc78830e861ab887abd19d9b961478bcf252e37881fdd61c81388308d4

LABEL base_runner_digest=${RUNNER_DIGEST}

ENV MISE_DATA_DIR=/home/runner/.local/share/mise
ENV PATH="${MISE_DATA_DIR}/bin:${PATH}"

USER root
RUN printf 'Acquire::Retries "5";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\n' \
    > /etc/apt/apt.conf.d/80network-retries && \
    apt-get update && apt-get install -y --no-install-recommends \
    zip wget xz-utils && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# === Stage 2: Install mise ===
FROM base AS mise
ARG MISE_VERSION
ARG MISE_SHA256
RUN curl --fail --location --retry 5 --retry-all-errors --connect-timeout 30 \
        "https://github.com/jdx/mise/releases/download/v${MISE_VERSION}/mise-v${MISE_VERSION}-linux-x64" \
        --output /usr/local/bin/mise && \
    echo "${MISE_SHA256}  /usr/local/bin/mise" | sha256sum --check --strict && \
    chmod +x /usr/local/bin/mise

# === Stage 3: Install Node.js ===
FROM mise AS nodejs
ENV NODE_VERSION=20.12.2
RUN curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz | \
    tar -xJ -C /usr/local --strip-components=1 && \
    corepack enable

# === Stage 4: Cleanup ===
FROM nodejs AS cleanup

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
    mise --version

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER runner

ENTRYPOINT ["/entrypoint.sh"]
