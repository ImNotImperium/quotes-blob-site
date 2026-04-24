#!/usr/bin/env node

const baseUrl = process.env.API_BASE_URL;
if (!baseUrl) {
  console.error("Set API_BASE_URL before running this script.");
  process.exit(1);
}

const csv = "name,value\nalpha,1\nbeta,2\n";
const body = {
  fileName: "sample.csv",
  mimeType: "text/csv",
  contentBase64: Buffer.from(csv, "utf-8").toString("base64")
};

const convertResponse = await fetch(`${baseUrl}/api/convert`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body)
});

const convertPayload = await convertResponse.json();
console.log("Convert response:", convertResponse.status, convertPayload);

if (convertPayload.downloadUrl) {
  console.log("Download URL:", convertPayload.downloadUrl);
  process.exit(0);
}

if (!convertPayload.jobId) {
  console.error("Missing jobId in response.");
  process.exit(1);
}

const maxAttempts = 20;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const statusResponse = await fetch(`${baseUrl}/api/status/${convertPayload.jobId}`);
  const statusPayload = await statusResponse.json();
  console.log(`Status attempt ${attempt}:`, statusPayload);

  if (statusPayload.state === "completed") {
    console.log("Completed. Download URL:", statusPayload.downloadUrl);
    process.exit(0);
  }

  if (statusPayload.state === "failed") {
    console.error("Job failed:", statusPayload.error);
    process.exit(1);
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));
}

console.error("Timed out waiting for conversion completion.");
process.exit(1);
