import path from "node:path";
import { ConversionRequestBody } from "../types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set([".csv"]);
const SUPPORTED_MIME_TYPES = new Set(["text/csv", "application/vnd.ms-excel"]);

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateConversionRequest(body: ConversionRequestBody): ValidationResult {
  const errors: string[] = [];

  if (!body.fileName) {
    errors.push("Missing fileName.");
  }

  if (!body.contentBase64) {
    errors.push("Missing contentBase64.");
  }

  if (errors.length) {
    return { valid: false, errors };
  }

  const extension = path.extname(body.fileName ?? "").toLowerCase();
  const mime = body.mimeType?.toLowerCase();

  const extensionSupported = SUPPORTED_EXTENSIONS.has(extension);
  const mimeSupported = mime ? SUPPORTED_MIME_TYPES.has(mime) : false;

  if (!extensionSupported && !mimeSupported) {
    errors.push(`Unsupported file type '${extension || mime || "unknown"}'. Supported types: .csv`);
  }

  const estimatedByteSize = estimateByteSize(body.contentBase64 ?? "");
  if (estimatedByteSize > MAX_FILE_BYTES) {
    errors.push(`File size exceeds 10MB limit. Received ~${estimatedByteSize} bytes.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function estimateByteSize(base64: string): number {
  const padding = (base64.match(/=+$/)?.[0].length ?? 0);
  return Math.floor((base64.length * 3) / 4) - padding;
}
