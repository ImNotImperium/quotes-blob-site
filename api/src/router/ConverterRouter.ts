import { IConverter } from "../converters/IConverter";
import { ConvertedArtifact, FilePayload } from "../types";

export class ConverterRouter {
  public constructor(private readonly converters: IConverter[]) {}

  public resolveConverter(fileName: string, mimeType?: string): IConverter {
    const converter = this.converters.find((item) => item.supports(fileName, mimeType));
    if (!converter) {
      throw new Error(`No converter available for file '${fileName}' with mime '${mimeType ?? "unknown"}'.`);
    }

    return converter;
  }

  public async convert(input: FilePayload): Promise<ConvertedArtifact> {
    const converter = this.resolveConverter(input.fileName, input.mimeType);
    return converter.convert(input);
  }
}
