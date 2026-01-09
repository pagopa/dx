resource "awscc_bedrock_knowledge_base" "this" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "docs"
    resource_type = "bedrock_knowledge_base"
  }))
  role_arn = aws_iam_role.kb.arn
  tags     = var.tags
  knowledge_base_configuration = {
    type = "VECTOR"
    vector_knowledge_base_configuration = {
      # Using Amazon Titan Embed Text v2 model for text embedding.
      # This model provides a good balance between quality and cost for documentation indexing.
      # The v2 variant includes improved multilingual support and better semantic understanding.
      embedding_model_arn = "arn:aws:bedrock:${var.naming_config.region}::foundation-model/amazon.titan-embed-text-v2:0"
      embedding_model_configuration = {
        bedrock_embedding_model_configuration = {
          # 1024 dimensions: Standard output for Titan Embed Text v2 model.
          # Provides sufficient expressiveness for semantic search while maintaining reasonable computational overhead.
          # This dimensionality balances retrieval quality with performance and cost considerations.
          dimensions = 1024
          # FLOAT32: High-precision floating-point representation for embeddings.
          # Ensures accurate semantic similarity calculations during vector search operations,
          # which is critical for retrieving relevant documentation snippets from the knowledge base.
          embedding_data_type = "FLOAT32"
        }
      }
    }
  }
  storage_configuration = {
    # S3_VECTORS: Uses Amazon S3 Vectors for scalable, cost-effective vector storage.
    # Provides high-performance similarity search with persistent vector embeddings.
    type = "S3_VECTORS"
    s3_vectors_configuration = {
      index_name        = aws_s3vectors_index.this.index_name
      vector_bucket_arn = aws_s3vectors_vector_bucket.this.vector_bucket_arn
    }
  }
}

resource "awscc_bedrock_data_source" "docs" {
  knowledge_base_id    = awscc_bedrock_knowledge_base.this.knowledge_base_id
  name                 = "${awscc_bedrock_knowledge_base.this.name}-dx-docs-data-source"
  data_deletion_policy = "DELETE"

  data_source_configuration = {
    type = "S3"
    s3_configuration = {
      bucket_arn = aws_s3_bucket.mcp_knowledge_base.arn
    }
  }

  vector_ingestion_configuration = {
    chunking_configuration = {
      # HIERARCHICAL strategy enables multi-level document chunking.
      # Processes documents at multiple granularities (coarse and fine-grained),
      # improving retrieval accuracy for both broad conceptual queries and detailed technical questions.
      chunking_strategy = "HIERARCHICAL"
      hierarchical_chunking_configuration = {
        # overlap_tokens = 60: Maintains context continuity between chunks.
        # Small overlaps ensure smooth transitions between chunks while avoiding excessive redundancy.
        # This helps preserve semantic coherence when chunks are retrieved independently.
        overlap_tokens = 60
        level_configurations = [
          {
            # First level (coarse): max_tokens = 1500
            # Creates larger chunks suitable for capturing high-level topics and broad concepts.
            # Balances informativeness with manageability for semantic search.
            max_tokens = 1500
          },
          {
            # Second level (fine): max_tokens = 300
            # Creates smaller, more granular chunks for detailed retrieval.
            # Helps answer specific technical questions with precise, focused context.
            max_tokens = 300
          }
        ]
      }
    }
  }
}

# Defines an IAM role that allows Bedrock to access the vector database and LLMs.
resource "aws_iam_role" "kb" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "kb"
    resource_type = "iam_role"
  }))

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = "AmazonBedrockKnowledgeBaseTrustPolicy"
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = var.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:bedrock:${var.naming_config.region}:${var.account_id}:knowledge-base/*"
          }
        }
      },
    ]
  })
  tags = var.tags
}

# Defines an IAM policy to allow the KB to use Bedrock LLMs.
resource "aws_iam_policy" "bedrock_llms_access" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "bedrock-llms-access"
    resource_type = "iam_policy"
  }))

  description = "IAM policy for the Knowledge Base to access Bedrock LLMs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Sid    = "BedrockInvokeEmbeddingModelStatement"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = ["arn:aws:bedrock:${var.naming_config.region}::foundation-model/amazon.titan-embed-text-v2:0", "arn:aws:bedrock:${var.naming_config.region}::foundation-model/amazon.rerank-v1:0"]
      },
      {
        Sid    = "BedrockInvokeRerankingModelStatement",
        Effect = "Allow",
        Action = [
          "bedrock:Rerank"
        ],
        Resource = "*"
      }
    ]
  })
  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "bedrock_llms_access" {
  role       = aws_iam_role.kb.name
  policy_arn = aws_iam_policy.bedrock_llms_access.arn
}

resource "aws_s3vectors_vector_bucket" "this" {
  vector_bucket_name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "docs"
    resource_type = "s3_vector_bucket"
  }))
  region = var.naming_config.region

  encryption_configuration = [{
    kms_key_arn = null
    sse_type    = "AES256"
  }]
  tags = var.tags
}

resource "aws_s3vectors_index" "this" {
  index_name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "docs"
    resource_type = "s3_vector_bucket_index"
  }))

  data_type       = "float32"
  dimension       = 1024
  distance_metric = "euclidean"
  encryption_configuration = [{
    kms_key_arn = null
    sse_type    = "AES256"
  }]
  region             = var.naming_config.region
  tags               = null
  vector_bucket_name = aws_s3vectors_vector_bucket.this.vector_bucket_name
  metadata_configuration {
    non_filterable_metadata_keys = ["AMAZON_BEDROCK_METADATA", "AMAZON_BEDROCK_TEXT"]
  }
}

# Defines an IAM policy to allow the KB to access data sources.
resource "aws_iam_policy" "kb_data_sources_access" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "data-sources-access"
    resource_type = "iam_policy"
  }))

  description = "IAM policy for the Knowledge Base to access data sources"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Sid    = "S3ListBucketStatement"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.mcp_knowledge_base.arn
        Condition = {
          StringEquals = {
            "aws:ResourceAccount" = var.account_id
          }
        }
      },
      {
        Sid    = "S3GetObjectStatement",
        Effect = "Allow",
        Action = [
          "s3:GetObject"
        ],
        Resource = "${aws_s3_bucket.mcp_knowledge_base.arn}/*"
        Condition = {
          StringEquals = {
            "aws:ResourceAccount" = var.account_id
          }
        }
      }
    ]
  })
  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "kb_data_sources_access" {
  role       = aws_iam_role.kb.name
  policy_arn = aws_iam_policy.kb_data_sources_access.arn
}

resource "aws_iam_policy" "kb_vector_store_access" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "vector-store-access"
    resource_type = "iam_policy"
  }))

  description = "IAM policy for the Knowledge Base to access vector store"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Sid    = "S3VectorsPermissions"
        Action = [
          "s3vectors:GetIndex",
          "s3vectors:QueryVectors",
          "s3vectors:PutVectors",
          "s3vectors:GetVectors",
          "s3vectors:DeleteVectors"
        ]
        Resource = aws_s3vectors_index.this.index_arn
        Condition = {
          StringEquals = {
            "aws:ResourceAccount" = var.account_id
          }
        }
      }
    ]
  })
  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "kb_vector_store_access" {
  role       = aws_iam_role.kb.name
  policy_arn = aws_iam_policy.kb_vector_store_access.arn
}
