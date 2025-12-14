/**
 * DynamoDB-based Token Storage Implementation
 * Provides persistent storage for OAuth tokens using AWS DynamoDB
 */

import type { TokenStorage } from "fastmcp/auth";

import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { getLogger } from "@logtape/logtape";

export type DynamoDBStoreOptions = {
  /**
   * AWS DynamoDB client (optional, will create one if not provided)
   */
  client?: DynamoDBClient;

  /**
   * AWS region
   * @default "eu-central-1"
   */
  region?: string;

  /**
   * DynamoDB table name
   */
  tableName: string;
};

type StorageEntry = {
  expiresAt: number;
  tokenKey: string;
  value: unknown;
};

/**
 * DynamoDB-based token storage with TTL support
 * Persists tokens to DynamoDB for high availability and scalability
 */
export class DynamoDBStore implements TokenStorage {
  private client: DynamoDBDocumentClient;
  private dynamodbClient: DynamoDBClient;
  private logger = getLogger(["mcpserver", "dynamo-db-token-store"]);
  private region: string;
  private tableName: string;

  constructor(options: DynamoDBStoreOptions) {
    this.tableName = options.tableName;
    this.region = options.region || "eu-central-1";

    // Create or use provided DynamoDB client
    this.dynamodbClient =
      options.client || new DynamoDBClient({ region: this.region });

    this.client = DynamoDBDocumentClient.from(this.dynamodbClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }

  /**
   * Clean up expired entries
   * Note: DynamoDB TTL automatically deletes expired items within 48 hours.
   * This method is a no-op but kept for interface compatibility.
   */
  async cleanup(): Promise<void> {
    // DynamoDB TTL handles automatic expiration
    this.logger.debug(
      "[DynamoDBStore] DynamoDB TTL automatically manages token expiration",
    );
  }

  /**
   * Delete a value
   */
  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        Key: {
          tokenKey: key,
        },
        TableName: this.tableName,
      });

      await this.client.send(command);
    } catch (error) {
      this.logger.error(
        `[DynamoDBStore] Failed to delete key ${key}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Destroy the storage and clear cleanup interval
   */
  destroy(): void {
    // Close the client connection
    void this.dynamodbClient.destroy();
  }

  /**
   * Retrieve a value
   */
  async get(key: string): Promise<null | unknown> {
    try {
      const command = new GetCommand({
        Key: {
          tokenKey: key,
        },
        TableName: this.tableName,
      });

      const response = await this.client.send(command);

      if (!response.Item) {
        return null;
      }

      const entry = response.Item as StorageEntry;

      // Check if expired
      const now = Math.floor(Date.now() / 1000);
      if (entry.expiresAt < now) {
        // Delete expired item
        await this.delete(key);
        return null;
      }

      return entry.value;
    } catch (error) {
      this.logger.error(`[DynamoDBStore] Failed to read key ${key}: ${error}`);
      return null;
    }
  }

  /**
   * Save a value with optional TTL
   */
  async save(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = ttl ? now + ttl : Math.floor(Date.now() / 1000) + 28800; // 8 hours default

      const command = new PutCommand({
        Item: {
          createdAt: now,
          expiresAt,
          tokenKey: key,
          updatedAt: now,
          value,
        } as StorageEntry & { createdAt: number; updatedAt: number },
        TableName: this.tableName,
      });

      await this.client.send(command);
    } catch (error) {
      this.logger.error(`[DynamoDBStore] Failed to save key ${key}: ${error}`);
      throw error;
    }
  }

  /**
   * Get the number of stored items
   * Note: This is approximate due to DynamoDB's eventual consistency
   */
  async size(): Promise<number> {
    try {
      // DynamoDB doesn't have a direct count of items in a table
      // This uses describe table which gives ItemCount (approximate)
      const command = new DescribeTableCommand({
        TableName: this.tableName,
      });
      const response = await this.dynamodbClient.send(command);

      return response.Table?.ItemCount || 0;
    } catch (error) {
      this.logger.error(`[DynamoDBStore] Failed to get size: ${error}`);
      return 0;
    }
  }
}
