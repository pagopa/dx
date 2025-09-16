#!/bin/bash
set -e

# Update system
dnf update -y

# Install required packages
dnf install -y wget tar systemd

# Create coredns user
useradd -r -s /bin/false coredns

# Download and install CoreDNS
COREDNS_VERSION="1.11.1"
cd /tmp
wget https://github.com/coredns/coredns/releases/download/v$${COREDNS_VERSION}/coredns_$${COREDNS_VERSION}_linux_amd64.tgz
tar -xzf coredns_$${COREDNS_VERSION}_linux_amd64.tgz
mv coredns /usr/local/bin/
chmod +x /usr/local/bin/coredns

# Create directories
mkdir -p /etc/coredns
mkdir -p /var/log/coredns
chown coredns:coredns /var/log/coredns

# Create Corefile configuration
cat > /etc/coredns/Corefile << 'EOF'
# Azure zones - forward to Azure CoreDNS
*.azure {
    forward . ${azure_coredns_ip}
    log
}

# Azure internal zones
*.internal.azure {
    forward . ${azure_coredns_ip}
    log
}

# Azure private DNS zones (common patterns)
*.privatelink.azure.com {
    forward . ${azure_coredns_ip}
    log
}

*.azurewebsites.net {
    forward . ${azure_coredns_ip}
    log
}

*.database.azure.com {
    forward . ${azure_coredns_ip}
    log
}

*.documents.azure.com {
    forward . ${azure_coredns_ip}
    log
}

*.servicebus.windows.net {
    forward . ${azure_coredns_ip}
    log
}

*.blob.core.windows.net {
    forward . ${azure_coredns_ip}
    log
}

*.azure.net {
    forward . ${azure_coredns_ip}
    log
}

# AWS local zones and everything else - forward to VPC DNS
. {
    forward . ${vpc_dns_ip}
    log
    health_check 5s
}

# Error and health plugins
errors
health :8080
EOF

# Create systemd service
cat > /etc/systemd/system/coredns.service << 'EOF'
[Unit]
Description=CoreDNS DNS forwarder
Documentation=https://coredns.io
After=network.target

[Service]
Type=simple
User=coredns
Group=coredns
ExecStart=/usr/local/bin/coredns -conf /etc/coredns/Corefile
ExecReload=/bin/kill -SIGUSR1 $MAINPID
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=coredns

[Install]
WantedBy=multi-user.target
EOF

# Install and configure CloudWatch agent (optional)
dnf install -y amazon-cloudwatch-agent

cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/messages",
                        "log_group_name": "/aws/ec2/coredns/${region}",
                        "log_stream_name": "{instance_id}/system",
                        "timestamp_format": "%b %d %H:%M:%S"
                    }
                ]
            }
        }
    }
}
EOF

# Enable and start services
systemctl daemon-reload
systemctl enable coredns
systemctl start coredns
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

# Configure rsyslog to capture CoreDNS logs
cat >> /etc/rsyslog.conf << 'EOF'
# CoreDNS logs
:programname, isequal, "coredns" /var/log/coredns/coredns.log
& stop
EOF

systemctl restart rsyslog

echo "CoreDNS installation completed successfully"
