export interface Logger {
  error(message: string): void;
  log(message: string): void;
  success(message: string): void;
}
