#!/bin/bash
set -e

# Log everything for debugging
exec > >(tee /var/log/user-data.log) 2>&1

# Update system
dnf update -y
# Install required packages (SSM agent already installed on AL2023)
dnf install -y wget tar

# Enable and start SSM agent (should already be running, but ensure it's enabled)
systemctl enable amazon-ssm-agent
systemctl restart amazon-ssm-agent

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
# AWS local zones and everything else - forward to VPC DNS
.:53 {
  errors
  ready
  health
  forward . ${vpc_dns_ip}
  cache 30
  loop
  reload
}
EOF

# Create systemd service
cat > /etc/systemd/system/coredns.service << 'EOF'
[Unit]
Description=CoreDNS DNS forwarder
Documentation=https://coredns.io
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/coredns -conf /etc/coredns/Corefile
ExecReload=/bin/kill -SIGUSR1 $MAINPID
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=coredns
KillMode=mixed
KillSignal=SIGTERM

[Install]
WantedBy=multi-user.target
EOF

# Install CloudWatch agent (available in AL2023 repos)
dnf install -y amazon-cloudwatch-agent

# Create CloudWatch agent config directory
mkdir -p /opt/aws/amazon-cloudwatch-agent/etc

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
    },
    "metrics": {
        "namespace": "AWS/EC2/CoreDNS",
        "metrics_collected": {
            "cpu": {
                "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],
                "metrics_collection_interval": 60
            },
            "disk": {
                "measurement": ["used_percent"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "mem": {
                "measurement": ["mem_used_percent"],
                "metrics_collection_interval": 60
            }
        }
    }
}
EOF

# Configure systemd journal for CoreDNS logs (AL2023 uses systemd by default)
# No need for rsyslog configuration as systemd journal handles it

# Enable and start services
systemctl daemon-reload
systemctl enable coredns
systemctl start coredns
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

# Wait a moment for services to start
sleep 10

# Verify services are running
echo "=== Service Status Check ==="
systemctl is-active amazon-ssm-agent && echo "SSM agent: RUNNING" || echo "ERROR: SSM agent failed to start"
systemctl is-active coredns && echo "CoreDNS: RUNNING" || echo "ERROR: CoreDNS failed to start"
systemctl is-active amazon-cloudwatch-agent && echo "CloudWatch agent: RUNNING" || echo "ERROR: CloudWatch agent failed to start"

# Show CoreDNS status for debugging
echo "=== CoreDNS Status ==="
systemctl status coredns --no-pager --lines=10

echo "CoreDNS installation completed successfully"