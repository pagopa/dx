/**
 * Error thrown when a filesystem operation fails (e.g., file not found, permission denied).
 */
export class FileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileError";
    Object.setPrototypeOf(this, FileError.prototype);
  }
}
