#!/usr/bin/env bash

set -e

echo "Choose the version of PlantUML to install"
if [ "$VERSION" = "latest" ]; then
    PLANTUML_VERSION=$(curl -s https://api.github.com/repos/plantuml/plantuml/releases/latest | jq -r '.tag_name')
else
    PLANTUML_VERSION=$VERSION
fi

echo "Create the PlantUML directory"
mkdir /opt/plantuml
chmod 755 /opt/plantuml
cd /opt/plantuml

echo "Install PlantUML dependencies"
sudo apt-get update && apt-get install -y default-jre-headless graphviz

echo "Import the PlantUML JAR Signing Key"
gpg --recv-keys C08C18EE1706DB378BD993C8019586D44BD80213

echo "Downloads PlantUML JAR and its signature"
curl -L "https://github.com/plantuml/plantuml/releases/download/$PLANTUML_VERSION/plantuml-${PLANTUML_VERSION:1}.{jar,jar.asc}" -o "plantuml.#1"

echo "Verify the PlantUML JAR signature"
gpg --verify plantuml.jar.asc plantuml.jar

cat > plantuml.sh <<EOF
#!/bin/sh
java -Djava.net.useSystemProxies=true -Djava.awt.headless=true -jar /opt/plantuml/plantuml.jar "\$@"
EOF

chmod +x plantuml.sh

echo "Create a symbolic link to the plantuml launcher"
ln -s /opt/plantuml/plantuml.sh /usr/local/bin/plantuml

echo "Done!"
