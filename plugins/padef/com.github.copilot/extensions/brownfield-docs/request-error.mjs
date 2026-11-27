// Carries actionable HTTP status codes from state operations to the canvas.
export class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
