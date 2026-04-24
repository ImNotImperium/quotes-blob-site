const { createElement: h, useMemo, useRef, useState } = React;

const DEFAULT_PROD_API_BASE_URL = "https://quotesappra1064-cweubscvg5gmhne7.francecentral-01.azurewebsites.net";
const API_BASE_URL =
  window.FILE_CONVERTER_API_BASE_URL ||
  (["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
    ? "http://localhost:7071"
    : DEFAULT_PROD_API_BASE_URL);
const MAX_BYTES = 10 * 1024 * 1024;

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("Drop a CSV file or browse to upload.");
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  const fileMeta = useMemo(() => {
    if (!file) return "No file selected yet.";
    return `${file.name} - ${Math.round(file.size / 1024)} KB`;
  }, [file]);

  const onPickClick = () => inputRef.current?.click();

  const onFileChosen = (nextFile) => {
    setDownloadUrl("");
    setJobId("");
    setError("");

    if (!nextFile) {
      setFile(null);
      setStatus("No file selected.");
      return;
    }

    const extOk = nextFile.name.toLowerCase().endsWith(".csv");
    if (!extOk) {
      setFile(null);
      setError("Only .csv files are supported in this boilerplate.");
      return;
    }

    if (nextFile.size > MAX_BYTES) {
      setFile(null);
      setError("File exceeds the 10MB upload limit.");
      return;
    }

    setFile(nextFile);
    setStatus("Ready to convert.");
  };

  const onSubmit = async () => {
    if (!file || isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    setDownloadUrl("");
    setStatus("Encoding file and sending conversion request...");

    try {
      const data = await file.arrayBuffer();
      const bytes = new Uint8Array(data);

      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        const slice = bytes.subarray(i, i + chunk);
        binary += String.fromCharCode(...slice);
      }

      const payload = {
        fileName: file.name,
        mimeType: file.type || "text/csv",
        contentBase64: btoa(binary)
      };

      const response = await fetch(`${API_BASE_URL}/api/convert`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = await safeReadJson(response);
      if (!response.ok) {
        throw new Error(body?.error || body?.rawText || `Conversion failed with status ${response.status}`);
      }

      if (body.downloadUrl) {
        setDownloadUrl(body.downloadUrl);
        setStatus("Conversion completed successfully.");
        return;
      }

      if (body.jobId) {
        setJobId(body.jobId);
        setStatus("Job accepted. Polling for completion...");
        await pollStatus(body.jobId, setStatus, setDownloadUrl);
        return;
      }

      throw new Error("Unexpected API response shape.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected upload error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return h("section", { className: "panel" }, [
    h("h1", { key: "title", className: "title" }, "Cloud-Native File Converter"),
    h(
      "p",
      { key: "subtitle", className: "subtitle" },
      "Upload CSV files, convert them with serverless functions, and retrieve downloadable results from cloud storage."
    ),
    h(
      "div",
      {
        key: "dropzone",
        className: "dropzone",
        onDragOver: (event) => event.preventDefault(),
        onDrop: (event) => {
          event.preventDefault();
          onFileChosen(event.dataTransfer.files?.[0] || null);
        }
      },
      [
        h("strong", { key: "dz-title" }, "Drop CSV Here"),
        h("p", { key: "dz-sub", className: "meta" }, "Supported: .csv up to 10MB"),
        h("input", {
          key: "file-input",
          ref: inputRef,
          type: "file",
          accept: ".csv,text/csv",
          style: { display: "none" },
          onChange: (event) => onFileChosen(event.target.files?.[0] || null)
        }),
        h("div", { key: "controls", className: "controls" }, [
          h("button", { key: "pick", className: "secondary", type: "button", onClick: onPickClick }, "Choose File"),
          h(
            "button",
            { key: "convert", type: "button", disabled: !file || isSubmitting, onClick: onSubmit },
            isSubmitting ? "Converting..." : "Convert to XLSX"
          )
        ])
      ]
    ),
    h("div", { key: "meta", className: "meta" }, fileMeta),
    h("div", { key: "status", className: `status${error ? " error" : ""}` }, error || status),
    jobId ? h("div", { key: "job", className: "status" }, `Job ID: ${jobId}`) : null,
    downloadUrl
      ? h(
          "a",
          { key: "download", className: "download", href: downloadUrl, target: "_blank", rel: "noreferrer" },
          "Download converted file"
        )
      : null
  ]);
}

async function pollStatus(jobId, setStatus, setDownloadUrl) {
  const maxAttempts = 30;
  for (let i = 1; i <= maxAttempts; i += 1) {
    const response = await fetch(`${API_BASE_URL}/api/status/${jobId}`);
    const body = await safeReadJson(response);

    if (!response.ok) {
      throw new Error(body?.error || body?.rawText || "Failed to retrieve job status.");
    }

    setStatus(`Job ${body.state}. Poll attempt ${i}/${maxAttempts}.`);

    if (body.state === "completed") {
      setDownloadUrl(body.downloadUrl);
      setStatus("Conversion completed successfully.");
      return;
    }

    if (body.state === "failed") {
      throw new Error(body.error || "The conversion job failed.");
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Timed out waiting for conversion to finish.");
}

ReactDOM.createRoot(document.getElementById("root")).render(h(App));

async function safeReadJson(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { rawText: text };
  }
}