resource "aws_cloudfront_function" "host_header_function" {
  name    = "${local.app_prefix}-preserve-host-${local.app_suffix}"
  runtime = "cloudfront-js-1.0"
  comment = "Next.js Function for Preserving Original Host"
  publish = true
  code    = <<EOF
function handler(event) {
  var request = event.request;
  request.headers["x-forwarded-host"] = request.headers.host;
  return request;
}
EOF
}

resource "aws_cloudfront_origin_request_policy" "origin_request_policy" {
  name    = "${local.app_prefix}-origin-request-policy-${local.app_suffix}"
  comment = "${local.app_prefix} Origin Request Policy for Next.js Application"

  cookies_config {
    cookie_behavior = "all"
    cookies {
      items = []
    }
  }

  headers_config {
    header_behavior = "whitelist"

    headers {
      items = ["accept", "rsc", "next-router-prefetch", "next-router-state-tree", "x-prerender-revalidate"]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
    query_strings {
      items = []
    }
  }
}

resource "aws_cloudfront_cache_policy" "cache_policy" {
  name    = "${local.app_prefix}-cache-policy-${local.app_suffix}"
  comment = "${local.app_prefix} Cache Policy for Next.js Application"

  default_ttl = 0
  min_ttl     = 0
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "all"

      dynamic "cookies" {
        for_each = []

        content {
          items = []
        }
      }
    }

    headers_config {
      header_behavior = "whitelist"

      headers {
        items = ["accept", "rsc", "next-router-prefetch", "next-router-state-tree", "x-prerender-revalidate"]
      }
    }

    query_strings_config {
      query_string_behavior = "all"

      dynamic "query_strings" {
        for_each = []

        content {
          items = []
        }
      }
    }
  }
}

resource "aws_cloudfront_response_headers_policy" "response_headers_policy" {
  name    = "${local.app_prefix}-response-headers-policy-${local.app_suffix}"
  comment = "${local.app_prefix} Response Headers Policy"

  cors_config {
    origin_override                  = true
    access_control_allow_credentials = false

    access_control_allow_headers {
      items = ["*"]
    }

    access_control_allow_methods {
      items = ["ALL"]
    }

    access_control_allow_origins {
      items = ["*"]
    }
  }

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
      preload                    = true
    }
  }

  dynamic "custom_headers_config" {
    for_each = length(var.custom_headers) > 0 ? [true] : []

    content {
      dynamic "items" {
        for_each = toset(var.custom_headers)

        content {
          header   = items.header
          override = items.override
          value    = items.value
        }
      }
    }
  }
}

resource "aws_cloudfront_distribution" "distribution" {
  price_class     = "PriceClass_All"
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${local.app_prefix} - CloudFront Distribution for Next.js Application"
  aliases         = var.custom_domain != null ? [var.custom_domain.domain_name] : []
  web_acl_id      = var.enable_waf ? aws_wafv2_web_acl.cloudfront[0].arn : null

  viewer_certificate {
    cloudfront_default_certificate = var.custom_domain != null ? false : true
    acm_certificate_arn            = var.custom_domain != null ? var.custom_domain.acm_certificate_arn : null
    ssl_support_method             = var.custom_domain != null ? "sni-only" : null
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
      locations        = []
    }
  }

  # S3 Bucket Origin
  origin {
    domain_name              = var.origins.assets_bucket.domain_name
    origin_id                = "${local.app_prefix}-assets-origin-${local.app_suffix}"
    origin_path              = "/assets"
    origin_access_control_id = var.origins.assets_bucket.oai
  }

  # Server Function Origin
  origin {
    domain_name              = var.origins.server_function.url
    origin_id                = "${local.app_prefix}-server-origin-${local.app_suffix}"
    origin_access_control_id = var.origins.server_function.oac

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Image Optimization Function Origin
  origin {
    domain_name              = var.origins.image_optimization_function.url
    origin_id                = "${local.app_prefix}-image-optimization-origin-${local.app_suffix}"
    origin_access_control_id = var.origins.image_optimization_function.oac

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Behaviour - Hashed Static Files (/_next/static/*)
  ordered_cache_behavior {
    path_pattern     = "/_next/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "${local.app_prefix}-assets-origin-${local.app_suffix}"

    response_headers_policy_id = aws_cloudfront_response_headers_policy.response_headers_policy.id
    cache_policy_id            = aws_cloudfront_cache_policy.cache_policy.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.origin_request_policy.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  ordered_cache_behavior {
    path_pattern     = "/_next/image"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "${local.app_prefix}-image-optimization-origin-${local.app_suffix}"

    response_headers_policy_id = aws_cloudfront_response_headers_policy.response_headers_policy.id
    cache_policy_id            = aws_cloudfront_cache_policy.cache_policy.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.origin_request_policy.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  ordered_cache_behavior {
    path_pattern     = "/_next/data/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "${local.app_prefix}-server-origin-${local.app_suffix}"

    response_headers_policy_id = aws_cloudfront_response_headers_policy.response_headers_policy.id
    cache_policy_id            = aws_cloudfront_cache_policy.cache_policy.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.origin_request_policy.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.host_header_function.arn
    }
  }

  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "${local.app_prefix}-server-origin-${local.app_suffix}"

    response_headers_policy_id = aws_cloudfront_response_headers_policy.response_headers_policy.id
    cache_policy_id            = aws_cloudfront_cache_policy.cache_policy.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.origin_request_policy.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.host_header_function.arn
    }
  }

  ordered_cache_behavior {
    path_pattern     = "/favicon.ico"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "${local.app_prefix}-assets-origin-${local.app_suffix}"

    response_headers_policy_id = aws_cloudfront_response_headers_policy.response_headers_policy.id
    cache_policy_id            = aws_cloudfront_cache_policy.cache_policy.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.origin_request_policy.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "${local.app_prefix}-server-origin-${local.app_suffix}"

    response_headers_policy_id = aws_cloudfront_response_headers_policy.response_headers_policy.id
    cache_policy_id            = aws_cloudfront_cache_policy.cache_policy.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.origin_request_policy.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.host_header_function.arn
    }
  }

  tags = var.tags
}
