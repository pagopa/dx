#!/usr/bin/env bash

set -e

CORE_TOOLS_VERSION=4.0.7030
BUILD_NUMBER=$(echo $CORE_TOOLS_VERSION | cut -d '.' -f 3)

echo "Clone Azure Functions Core Tools repository"
git clone --depth 1 --branch $CORE_TOOLS_VERSION https://github.com/Azure/azure-functions-core-tools.git

cd azure-functions-core-tools

echo "Build Azure Functions Core Tools"
dotnet publish src/Azure.Functions.Cli/Azure.Functions.Cli.csproj \
 /p:BuildNumber=$BUILD_NUMBER \
 --use-current-runtime \
 --framework=net8.0 \
 --output /opt/azure-functions-core-tools

echo "Create a symbolic link to the func binary"
ln -s /opt/azure-functions-core-tools/func /usr/local/bin/func
chmod +x /opt/azure-functions-core-tools/func

echo "Cleanup"
cd ..
rm -rf azure-functions-core-tools

echo "Done!"
