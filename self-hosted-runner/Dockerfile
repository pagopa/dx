# ==== STAGE 1: Install Azure, AWS, Tools and NodeJS ====
FROM ghcr.io/actions/actions-runner:latest AS tools

USER root

ENV NODE_VERSION=20.12.2

RUN apt-get update && apt-get install -y --no-install-recommends \
    zip wget xz-utils && \
    # Install Node.js from binary
    curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz | \
    tar -xJ -C /usr/local --strip-components=1 && \
    corepack enable && \
    # Install Azure CLI
    curl -sL https://aka.ms/InstallAzureCLIDeb | bash && \
    # Install AWS CLI
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip -q awscliv2.zip && \
    ./aws/install && \
    # Aggressive cleanup
    rm -rf awscliv2.zip aws && \
    apt-get remove -y xz-utils && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /usr/share/doc/* /usr/share/man/* /var/cache/debconf/* && \
    npm cache clean --force && \
    rm -rf /root/.npm

# ==== STAGE 2: Finalize ====
FROM tools

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER runner

ENTRYPOINT ["/entrypoint.sh"]