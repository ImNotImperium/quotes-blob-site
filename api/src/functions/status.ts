import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { JobStore } from "../services/jobStore";
import { StorageService } from "../services/storageService";

app.http("status", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "status/{jobId}",
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const jobId = request.params.jobId;
    if (!jobId) {
      return { status: 400, jsonBody: { error: "Missing jobId route parameter." } };
    }

    const jobs = new JobStore(new StorageService());
    const status = await jobs.get(jobId);

    if (!status) {
      return { status: 404, jsonBody: { error: "Job not found." } };
    }

    return { status: 200, jsonBody: status };
  }
});
