# Cloud-Native File Converter Architecture

## Overview
- Frontend: Static React app in `site/` with upload, submit, and status polling UX.
- Backend: Azure Functions (`api/`) with HTTP routes and queue-triggered workers.
- Storage: Azure Blob containers for originals, converted outputs, and status JSON.
- Queue: Azure Storage Queue for asynchronous conversion workloads.

## Cost-Aware Design Notes
- Compute-on-demand: Conversion logic runs only when requests/jobs arrive, so idle cost is minimal on the Functions Consumption plan.
- Async queue smoothing: Bursty uploads are buffered in queue messages so the API remains fast and workers scale elastically.
- Lifecycle cleanup: Terraform policy deletes old blobs from `original/` prefix after 30 days to reduce storage growth.
- Decoupled frontend hosting: Static site is served directly from Blob static website, avoiding always-on web server costs.
- Structured logs: JSON logs enable targeted retention/queries in log analytics without verbose, expensive log volume.

## API Contract Summary
- `POST /api/convert`: Accepts base64 content, validates, stores original, converts sync or queues async, returns `downloadUrl` or `jobId`.
- `GET /api/status/{jobId}`: Returns `queued`, `processing`, `completed`, or `failed` with optional `downloadUrl`.
