
# === Stage 1: Install runner dependencies and mise ===
FROM ghcr.io/actions/actions-runner:2.336.0@sha256:0cfdcc701ce933c6d243c6b0b2da767366dc9f2e99961d4c3754b0b78084cdda AS mise

ARG MISE_VERSION=2026.8.1
ARG MISE_SHA256=961b1fcc78830e861ab887abd19d9b961478bcf252e37881fdd61c81388308d4

ENV MISE_DATA_DIR=/home/runner/.local/share/mise
ENV PATH="${MISE_DATA_DIR}/shims:${MISE_DATA_DIR}/bin:${PATH}"

USER root
# Mise backends use standard XDG directories that vary by tool. Keep those
# roots writable without changing ownership outside those locations.
RUN install -d -o runner -g runner -m 0755 \
        /home/runner/.local/bin \
        /home/runner/.local/share \
        /home/runner/.local/state \
        /home/runner/.config \
        /home/runner/.cache \
        "${MISE_DATA_DIR}/bin" && \
    chown -R runner:runner \
        /home/runner/.local/bin \
        /home/runner/.local/share \
        /home/runner/.local/state \
        /home/runner/.config \
        /home/runner/.cache
RUN curl --fail --location --retry 5 --retry-all-errors --connect-timeout 30 \
        "https://github.com/jdx/mise/releases/download/v${MISE_VERSION}/mise-v${MISE_VERSION}-linux-x64" \
        --output "${MISE_DATA_DIR}/bin/mise" && \
    echo "${MISE_SHA256}  ${MISE_DATA_DIR}/bin/mise" | sha256sum --check --strict && \
    chmod +x "${MISE_DATA_DIR}/bin/mise"

# === Final Stage ===
FROM mise AS final

COPY entrypoint.sh /entrypoint.sh
COPY --chown=runner:runner mise.toml /home/runner/mise.toml
RUN chmod +x /entrypoint.sh

USER runner

RUN set -eux; \
    cd /home/runner; \
    mise trust mise.toml; \
    mise install; \
    mise ls --current

RUN set -eux; \
    cd /home/runner; \
    openssl version; \
    mise --version; \
    mise ls --local --no-header;

RUN set -eux; \
    cd /home/runner; \
    test -s ./run.sh; \
    test -s ./externals/node24/bin/node; \
    ./externals/node24/bin/node --version

ENTRYPOINT ["/entrypoint.sh"]
