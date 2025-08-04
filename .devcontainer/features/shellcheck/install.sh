#!/usr/bin/env bash

set -e

sudo apt-get update
sudo apt-get install -y --no-install-recommends shellcheck

echo "ShellCheck installed successfully!"
