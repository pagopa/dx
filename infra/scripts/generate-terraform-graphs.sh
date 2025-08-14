#!/bin/bash
set -e

if ! command -v dot &> /dev/null; then
    echo "Please install Graphviz, for MAC use the command:"
    echo "  - brew install graphviz"
    exit 1
fi

echo "🔎 Finding changed Terraform modules directories compared to 'main' branch..."
DIRECTORIES=$(git diff --name-only origin/main \
    | xargs -n 1 dirname \
    | sort -u \
    | grep '^infra/modules' \
    | sed -E 's#(.*)/_modules/.*#\1#' \
    | sort -u)

if [ -z "$DIRECTORIES" ]; then
    echo "✅ No modules with file changes detected. Nothing to do."
    exit 0
fi

echo "Directory with changes:"
echo "$DIRECTORIES"
echo "---"

for DIR in $DIRECTORIES; do
    echo "🔄 Graph generation in: $DIR"
    
    (cd "$DIR" && terraform init && terraform graph > graph.dot)
    
    echo "✅ File graph.dot generated"
    echo "---"
done