/**
 * Error thrown when attempting to create an unknown or invalid builder type.
 */
export class InvalidBuilderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBuilderError";
    Object.setPrototypeOf(this, InvalidBuilderError.prototype);
  }
}
