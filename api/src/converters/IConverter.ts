import { ConvertedArtifact, FilePayload } from "../types";

export interface IConverter {
  readonly name: string;
  readonly outputExtension: string;
  supports(fileName: string, mimeType?: string): boolean;
  convert(input: FilePayload): Promise<ConvertedArtifact>;
}
