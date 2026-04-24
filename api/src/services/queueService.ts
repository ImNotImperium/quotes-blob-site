import { QueueClient } from "@azure/storage-queue";
import { ConversionJobMessage } from "../types";

export class QueueService {
  private readonly queueName = process.env.CONVERSION_QUEUE_NAME ?? "conversion-jobs";
  private readonly queueClient: QueueClient;

  public constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING ?? process.env.AzureWebJobsStorage;
    if (!connectionString) {
      throw new Error("Missing Azure Storage connection string in AZURE_STORAGE_CONNECTION_STRING or AzureWebJobsStorage.");
    }

    this.queueClient = new QueueClient(connectionString, this.queueName);
  }

  public async enqueue(message: ConversionJobMessage): Promise<void> {
    await this.queueClient.createIfNotExists();
    const payload = Buffer.from(JSON.stringify(message), "utf-8").toString("base64");
    await this.queueClient.sendMessage(payload);
  }
}
