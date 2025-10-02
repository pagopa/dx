import {
    BedrockAgentRuntimeClient,
    RetrieveCommand,
    KnowledgeBaseRetrievalConfiguration,
  } from '@aws-sdk/client-bedrock-agent-runtime';
  import { logger } from '../utils/logger.js';
  
  type RerankingModelName = 'COHERE' | 'AMAZON';
  
  export async function queryKnowledgeBase(
    knowledgeBaseId: string,
    query: string,
    kbAgentClient: BedrockAgentRuntimeClient,
    numberOfResults: number = 20,
    reranking: boolean = false,
    rerankingModelName: RerankingModelName = 'AMAZON'
  ): Promise<string> {
    const clientRegion = await kbAgentClient.config.region();
    if (
      reranking &&
      !['us-west-2', 'us-east-1', 'ap-northeast-1', 'ca-central-1', 'eu-central-1'].includes(clientRegion)
    ) {
      logger.warn(`Reranking is not supported in region ${clientRegion}`);
      reranking = false;
    }
  
    const retrieveRequest: KnowledgeBaseRetrievalConfiguration = {
      vectorSearchConfiguration: {
        numberOfResults: numberOfResults,
      },
    };
  
    if (reranking && retrieveRequest.vectorSearchConfiguration) {
      const modelNameMapping: Record<RerankingModelName, string> = {
        COHERE: 'cohere.rerank-v3-5:0',
        AMAZON: 'amazon.rerank-v1:0',
      };
      retrieveRequest.vectorSearchConfiguration.rerankingConfiguration = {
          type: 'BEDROCK_RERANKING_MODEL',
          bedrockRerankingConfiguration: {
              modelConfiguration: {
                  modelArn: `arn:aws:bedrock:${clientRegion}::foundation-model/${modelNameMapping[rerankingModelName]}`,
              },
          },
      };
    }
  
    const command = new RetrieveCommand({
      knowledgeBaseId: knowledgeBaseId,
      retrievalQuery: { text: query },
      retrievalConfiguration: retrieveRequest,
    });
  
    const response = await kbAgentClient.send(command);
    const results = response.retrievalResults || [];
    const documents: Record<string, any>[] = [];
  
    for (const result of results) {
      if (result.content?.type === 'IMAGE') {
        logger.warn('Images are not supported at this time. Skipping...');
        continue;
      } else if (result.content?.text) {
        documents.push({
          content: result.content.text,
          location: result.location || '',
          score: result.score || '',
        });
      }
    }
  
    return documents.map((doc) => JSON.stringify(doc)).join('\n\n');
  }
  