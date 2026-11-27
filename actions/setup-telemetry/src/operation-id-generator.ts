/**
 * Correlates independently exported job spans without reusing their span IDs.
 */
import {
  type IdGenerator,
  RandomIdGenerator,
} from "@opentelemetry/sdk-trace-base";
import { createHash } from "node:crypto";

export class OperationIdGenerator implements IdGenerator {
  private readonly randomIdGenerator = new RandomIdGenerator();
  private readonly traceId: string | undefined;

  constructor(operationId: string) {
    this.traceId = operationId
      ? createHash("sha256").update(operationId).digest("hex").slice(0, 32)
      : undefined;
  }

  generateSpanId(): string {
    return this.randomIdGenerator.generateSpanId();
  }

  generateTraceId(): string {
    return this.traceId ?? this.randomIdGenerator.generateTraceId();
  }
}
