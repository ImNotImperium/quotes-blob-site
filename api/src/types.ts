export type FilePayload = {
  fileName: string;
  mimeType?: string;
  content: Buffer;
};

export type ConvertedArtifact = {
  fileName: string;
  mimeType: string;
  content: Buffer;
};

export type ConversionRequestBody = {
  fileName?: string;
  mimeType?: string;
  contentBase64?: string;
};

export type ConversionJobMessage = {
  jobId: string;
  originalBlobName: string;
  convertedBlobName: string;
  fileName: string;
  mimeType?: string;
};

export type JobState = "queued" | "processing" | "completed" | "failed";

export type JobStatus = {
  jobId: string;
  state: JobState;
  error?: string;
  downloadUrl?: string;
  updatedAt: string;
};
