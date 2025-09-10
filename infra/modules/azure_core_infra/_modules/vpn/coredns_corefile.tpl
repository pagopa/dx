# AWS zones - forward to AWS CoreDNS
*.aws {
    forward . ${aws_coredns_ip}
    log
}

# AWS internal zones  
*.internal.aws {
    forward . ${aws_coredns_ip}
    log
}

# AWS local zones (common pattern)
*.aws.local {
    forward . ${aws_coredns_ip}
    log
}

# Common AWS service patterns
*.compute.internal {
    forward . ${aws_coredns_ip}
    log
}

*.rds.amazonaws.com {
    forward . ${aws_coredns_ip}
    log
}

*.elasticache.amazonaws.com {
    forward . ${aws_coredns_ip}
    log
}

*.us-east-1.compute.internal {
    forward . ${aws_coredns_ip}
    log
}

*.us-west-2.compute.internal {
    forward . ${aws_coredns_ip}
    log
}

*.eu-west-1.compute.internal {
    forward . ${aws_coredns_ip}
    log
}

*.eu-central-1.compute.internal {
    forward . ${aws_coredns_ip}
    log
}

# Azure zones and everything else - forward to Azure DNS
. {
    forward . ${azure_dns_ip}
    log
    health_check 5s
}

# Error and health plugins
errors
health :8080
