import { app, InvocationContext } from "@azure/functions";
import { CsvToXlsxConverter } from "../converters/CsvToXlsxConverter";
import { ConverterRouter } from "../router/ConverterRouter";
import { JobStore } from "../services/jobStore";
import { StorageService } from "../services/storageService";
import { ConversionJobMessage, JobStatus } from "../types";
import { logger } from "../utils/logger";

const router = new ConverterRouter([new CsvToXlsxConverter()]);

app.storageQueue("processConversionJob", {
  queueName: "%CONVERSION_QUEUE_NAME%",
  connection: "AzureWebJobsStorage",
  handler: async (queueItem: unknown, context: InvocationContext): Promise<void> => {
    const message = parseMessage(queueItem);
    if (!message) {
      logger.error("Queue message is missing or malformed", { invocationId: context.invocationId });
      return;
    }

    const storage = new StorageService();
    const jobs = new JobStore(storage);

    try {
      await jobs.put(makeStatus(message.jobId, "processing"));
      const content = await storage.downloadOriginal(message.originalBlobName);
      const artifact = await router.convert({
        fileName: message.fileName,
        mimeType: message.mimeType,
        content
      });

      await storage.uploadConverted(artifact.content, message.convertedBlobName, artifact.mimeType);
      const downloadUrl = storage.getDownloadUrl(storage.getConvertedContainerName(), message.convertedBlobName);
      await jobs.put(makeStatus(message.jobId, "completed", downloadUrl));

      logger.info("Conversion job completed", {
        jobId: message.jobId,
        invocationId: context.invocationId
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : "Unknown queue conversion error.";
      logger.error("Conversion queue job failed", {
        jobId: message.jobId,
        details,
        invocationId: context.invocationId
      });
      await jobs.put(makeStatus(message.jobId, "failed", undefined, details));
    }
  }
});

function parseMessage(queueItem: unknown): ConversionJobMessage | null {
  if (!queueItem) {
    return null;
  }

  if (typeof queueItem === "object") {
    return queueItem as ConversionJobMessage;
  }

  if (typeof queueItem === "string") {
    try {
      const decoded = Buffer.from(queueItem, "base64").toString("utf-8");
      return JSON.parse(decoded) as ConversionJobMessage;
    } catch {
      try {
        return JSON.parse(queueItem) as ConversionJobMessage;
      } catch {
        return null;
      }
    }
  }

  return null;
}

function makeStatus(jobId: string, state: JobStatus["state"], downloadUrl?: string, error?: string): JobStatus {
  return {
    jobId,
    state,
    error,
    downloadUrl,
    updatedAt: new Date().toISOString()
  };
}
