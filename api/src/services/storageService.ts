import { BlobSASPermissions, BlobServiceClient, BlockBlobClient, StorageSharedKeyCredential, generateBlobSASQueryParameters } from "@azure/storage-blob";

export class StorageService {
  private readonly blobService: BlobServiceClient;
  private readonly originalContainer = process.env.ORIGINAL_CONTAINER ?? "original";
  private readonly convertedContainer = process.env.CONVERTED_CONTAINER ?? "converted";
  private readonly statusContainer = process.env.STATUS_CONTAINER ?? "status";
  private readonly sasToken = process.env.STORAGE_SAS_TOKEN;
  private readonly sharedKeyCredential: StorageSharedKeyCredential | null = null;

  public constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING ?? process.env.AzureWebJobsStorage;
    if (!connectionString) {
      throw new Error("Missing Azure Storage connection string in AZURE_STORAGE_CONNECTION_STRING or AzureWebJobsStorage.");
    }

    this.blobService = BlobServiceClient.fromConnectionString(connectionString);

    // Extract account name and key for SAS generation
    const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
    const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/);
    if (accountNameMatch && accountKeyMatch) {
      this.sharedKeyCredential = new StorageSharedKeyCredential(accountNameMatch[1], accountKeyMatch[1]);
    }
  }

  public getOriginalContainerName(): string {
    return this.originalContainer;
  }

  public getConvertedContainerName(): string {
    return this.convertedContainer;
  }

  public getStatusContainerName(): string {
    return this.statusContainer;
  }

  public async uploadOriginal(content: Buffer, blobName: string, contentType = "application/octet-stream"): Promise<void> {
    await this.uploadToContainer(this.originalContainer, blobName, content, contentType);
  }

  public async uploadConverted(content: Buffer, blobName: string, contentType: string): Promise<void> {
    await this.uploadToContainer(this.convertedContainer, blobName, content, contentType);
  }

  public async uploadStatus(blobName: string, content: Buffer): Promise<void> {
    await this.uploadToContainer(this.statusContainer, blobName, content, "application/json");
  }

  public async downloadOriginal(blobName: string): Promise<Buffer> {
    return this.downloadFromContainer(this.originalContainer, blobName);
  }

  public async downloadStatus(blobName: string): Promise<Buffer | null> {
    try {
      return await this.downloadFromContainer(this.statusContainer, blobName);
    } catch {
      return null;
    }
  }

  public getDownloadUrl(containerName: string, blobName: string): string {
    const blobClient = this.blobService.getContainerClient(containerName).getBlobClient(blobName);

    // Prefer a pre-configured SAS token (e.g. set via STORAGE_SAS_TOKEN env var)
    if (this.sasToken) {
      const token = this.sasToken.startsWith("?") ? this.sasToken.slice(1) : this.sasToken;
      return `${blobClient.url}?${token}`;
    }

    // Generate a short-lived SAS token using the account key
    if (this.sharedKeyCredential) {
      const expiresOn = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const sas = generateBlobSASQueryParameters(
        {
          containerName,
          blobName,
          permissions: BlobSASPermissions.parse("r"),
          expiresOn
        },
        this.sharedKeyCredential
      ).toString();
      return `${blobClient.url}?${sas}`;
    }

    // Fallback: plain URL (works only if container has public access)
    return blobClient.url;
  }

  private async uploadToContainer(
    containerName: string,
    blobName: string,
    content: Buffer,
    contentType: string
  ): Promise<void> {
    const container = this.blobService.getContainerClient(containerName);
    await container.createIfNotExists();

    const client = container.getBlockBlobClient(blobName);
    await client.uploadData(content, {
      blobHTTPHeaders: {
        blobContentType: contentType
      }
    });
  }

  private async downloadFromContainer(containerName: string, blobName: string): Promise<Buffer> {
    const container = this.blobService.getContainerClient(containerName);
    const client: BlockBlobClient = container.getBlockBlobClient(blobName);
    const response = await client.download();

    const chunks: Buffer[] = [];
    for await (const chunk of response.readableStreamBody ?? []) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }
}
