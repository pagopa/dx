export interface RepositoryReader {
  findRepositoryRoot(cwd: string): null | string;
}
