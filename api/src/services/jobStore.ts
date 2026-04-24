import { JobStatus } from "../types";
import { StorageService } from "./storageService";

export class JobStore {
  public constructor(private readonly storage: StorageService) {}

  public async put(status: JobStatus): Promise<void> {
    const blobName = this.getBlobName(status.jobId);
    await this.storage.uploadStatus(blobName, Buffer.from(JSON.stringify(status), "utf-8"));
  }

  public async get(jobId: string): Promise<JobStatus | null> {
    const blobName = this.getBlobName(jobId);
    const raw = await this.storage.downloadStatus(blobName);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw.toString("utf-8")) as JobStatus;
  }

  private getBlobName(jobId: string): string {
    return `${jobId}.json`;
  }
}
