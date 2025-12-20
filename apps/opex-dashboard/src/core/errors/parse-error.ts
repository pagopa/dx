/**
 * Error thrown when parsing an OpenAPI specification or template fails.
 */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}
