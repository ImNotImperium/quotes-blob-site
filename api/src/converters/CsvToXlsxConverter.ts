import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import path from "node:path";
import { IConverter } from "./IConverter";
import { ConvertedArtifact, FilePayload } from "../types";

const CSV_MIME_TYPES = new Set(["text/csv", "application/vnd.ms-excel"]);

export class CsvToXlsxConverter implements IConverter {
  public readonly name = "csv-to-xlsx";
  public readonly outputExtension = ".xlsx";

  public supports(fileName: string, mimeType?: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return ext === ".csv" || (mimeType ? CSV_MIME_TYPES.has(mimeType.toLowerCase()) : false);
  }

  public async convert(input: FilePayload): Promise<ConvertedArtifact> {
    const csvText = input.content.toString("utf-8");

    let rows: string[][];
    try {
      rows = parse(csvText, {
        skip_empty_lines: false,
        relax_column_count: true,
        bom: true
      }) as string[][];
    } catch {
      throw new Error("The uploaded CSV appears to be corrupt or malformed.");
    }

    if (!rows.length) {
      throw new Error("The uploaded CSV is empty.");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Converted");

    rows.forEach((row) => worksheet.addRow(row));

    if (rows[0]?.length) {
      worksheet.getRow(1).font = { bold: true };
    }

    const out = Buffer.from(await workbook.xlsx.writeBuffer());
    const outputName = input.fileName.replace(/\.csv$/i, this.outputExtension);

    return {
      fileName: outputName,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      content: out
    };
  }
}
