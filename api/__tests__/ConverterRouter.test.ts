import { ConverterRouter } from "../src/router/ConverterRouter";
import { IConverter } from "../src/converters/IConverter";

describe("ConverterRouter", () => {
  const fakeConverter: IConverter = {
    name: "fake",
    outputExtension: ".out",
    supports: (fileName: string) => fileName.endsWith(".csv"),
    convert: jest.fn(async () => ({
      fileName: "converted.out",
      mimeType: "application/octet-stream",
      content: Buffer.from("ok", "utf-8")
    }))
  };

  it("selects a matching converter by extension", () => {
    const router = new ConverterRouter([fakeConverter]);
    const resolved = router.resolveConverter("sample.csv", "text/csv");

    expect(resolved.name).toBe("fake");
  });

  it("throws a clear error for unsupported type", () => {
    const router = new ConverterRouter([fakeConverter]);

    expect(() => router.resolveConverter("sample.pdf", "application/pdf")).toThrow(
      "No converter available"
    );
  });

  it("delegates conversion to the resolved converter", async () => {
    const router = new ConverterRouter([fakeConverter]);
    const result = await router.convert({
      fileName: "sample.csv",
      mimeType: "text/csv",
      content: Buffer.from("a,b", "utf-8")
    });

    expect(result.fileName).toBe("converted.out");
    expect(fakeConverter.convert).toHaveBeenCalledTimes(1);
  });
});
