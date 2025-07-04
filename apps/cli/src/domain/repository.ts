import { Result } from "neverthrow";

export interface RepositoryReader {
  findRepositoryRoot(cwd: string): Result<string, Error>;
}
