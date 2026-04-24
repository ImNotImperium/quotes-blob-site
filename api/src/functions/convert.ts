import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import crypto from "node:crypto";
import path from "node:path";
import { CsvToXlsxConverter } from "../converters/CsvToXlsxConverter";
import { ConverterRouter } from "../router/ConverterRouter";
import { JobStore } from "../services/jobStore";
import { QueueService } from "../services/queueService";
import { StorageService } from "../services/storageService";
import { ConversionJobMessage, ConversionRequestBody, JobStatus } from "../types";
import { logger } from "../utils/logger";
import { validateConversionRequest } from "../utils/validation";

const router = new ConverterRouter([new CsvToXlsxConverter()]);

app.http("convert", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "convert",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    let body: ConversionRequestBody;

    try {
      body = (await request.json()) as ConversionRequestBody;
    } catch {
      return { status: 400, jsonBody: { error: "Invalid JSON payload." } };
    }

    const validation = validateConversionRequest(body);
    if (!validation.valid) {
      return { status: 400, jsonBody: { error: validation.errors.join(" ") } };
    }

    const fileName = sanitizeFileName(body.fileName!);
    const mimeType = body.mimeType;
    const content = Buffer.from(body.contentBase64!, "base64");

    if (!content.length) {
      return { status: 400, jsonBody: { error: "Decoded file content is empty or corrupt." } };
    }

    const jobId = crypto.randomUUID();
    const storage = new StorageService();
    const jobs = new JobStore(storage);
    const converter = router.resolveConverter(fileName, mimeType);

    const originalBlobName = `${jobId}/${fileName}`;
    const convertedName = `${path.basename(fileName, path.extname(fileName))}${converter.outputExtension}`;
    const convertedBlobName = `${jobId}/${convertedName}`;

    try {
      await storage.uploadOriginal(content, originalBlobName, mimeType || "application/octet-stream");

      if (isAsyncEnabled()) {
        await jobs.put(makeStatus(jobId, "queued"));

        const queue = new QueueService();
        const message: ConversionJobMessage = {
          jobId,
          originalBlobName,
          convertedBlobName,
          fileName,
          mimeType
        };
        await queue.enqueue(message);

        logger.info("Conversion job queued", { jobId, fileName, invocationId: context.invocationId });

        return {
          status: 202,
          jsonBody: {
            jobId,
            state: "queued",
            statusUrl: `/api/status/${jobId}`
          }
        };
      }

      await jobs.put(makeStatus(jobId, "processing"));
      const artifact = await router.convert({ fileName, mimeType, content });
      await storage.uploadConverted(artifact.content, convertedBlobName, artifact.mimeType);

      const downloadUrl = storage.getDownloadUrl(storage.getConvertedContainerName(), convertedBlobName);
      await jobs.put(makeStatus(jobId, "completed", downloadUrl));

      return {
        status: 200,
        jsonBody: {
          jobId,
          state: "completed",
          downloadUrl
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown conversion error.";
      logger.error("Conversion failed", { jobId, message, invocationId: context.invocationId });
      await jobs.put(makeStatus(jobId, "failed", undefined, message));
      return { status: 500, jsonBody: { error: message, jobId } };
    }
  }
});

function sanitizeFileName(fileName: string): string {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function makeStatus(jobId: string, state: JobStatus["state"], downloadUrl?: string, error?: string): JobStatus {
  return {
    jobId,
    state,
    downloadUrl,
    error,
    updatedAt: new Date().toISOString()
  };
}

function isAsyncEnabled(): boolean {
  return (process.env.USE_ASYNC_PROCESSING || "true").toLowerCase() === "true";
}
