/**
 * OpenAPI 3 specification resolver.
 * Parses and resolves OpenAPI specifications using swagger-parser.
 * Supports both file paths and HTTP URLs, with $ref resolution.
 */

import SwaggerParser from "@apidevtools/swagger-parser";

import { ParseError } from "../errors/index.js";

export class OA3Resolver {
  private specPath: string;

  constructor(specPath: string) {
    this.specPath = specPath;
  }

  /**
   * Resolve OpenAPI specification.
   * Parses fresh each time (no caching) to match Python behavior.
   * Resolves all $ref references automatically.
   */
  async resolve(): Promise<Record<string, unknown>> {
    try {
      // Parse and dereference the spec (resolves $ref)
      // This matches Python's prance.ResolvingParser behavior
      const api = await SwaggerParser.dereference(this.specPath);
      return api as Record<string, unknown>;
    } catch (error) {
      if (error instanceof Error) {
        throw new ParseError(`OA3 parsing error: ${error.message}`);
      }
      throw new ParseError(`OA3 parsing error: ${String(error)}`);
    }
  }
}
