// Replace this with your Function App base URL after you deploy the function.
// Example: https://quotesapp-abcdefg.azurewebsites.net
const FUNCTION_BASE_URL = "https://quotesappra1064-cweubscvg5gmhne7.francecentral-01.azurewebsites.net";

const btn = document.getElementById("btn");
const quoteEl = document.getElementById("quote");
const statusEl = document.getElementById("status");

if (btn && quoteEl && statusEl) {
  btn.addEventListener("click", async () => {
    statusEl.textContent = "Fetching...";
    btn.disabled = true;

    try {
      const res = await fetch(`${FUNCTION_BASE_URL}/api/quote`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      quoteEl.textContent = data.quote ?? "No quote returned.";
      statusEl.textContent = "";
    } catch (err) {
      quoteEl.textContent = "Could not fetch a quote.";
      statusEl.textContent = String(err);
    } finally {
      btn.disabled = false;
    }
  });
}

const fileInput = document.getElementById("fileInput");
const btnFormat = document.getElementById("btnFormat");
const btnCopy = document.getElementById("btnCopy");
const outputEl = document.getElementById("output");

let selectedFile = null;

if (fileInput && btnFormat && btnCopy && statusEl && outputEl) {
  fileInput.addEventListener("change", () => {
    selectedFile = fileInput.files?.[0] ?? null;
    outputEl.value = "";
    btnCopy.disabled = true;

    if (!selectedFile) {
      btnFormat.disabled = true;
      statusEl.textContent = "";
      return;
    }

    // Basic validation
    const nameOk = selectedFile.name.toLowerCase().endsWith(".txt");
    const typeOk = (selectedFile.type || "").startsWith("text/");
    const isText = nameOk || typeOk;
    const maxBytes = 200 * 1024; // 200KB for a demo

    if (!isText) {
      btnFormat.disabled = true;
      statusEl.textContent = "Please select a plain text (.txt) file.";
      selectedFile = null;
      return;
    }

    if (selectedFile.size > maxBytes) {
      btnFormat.disabled = true;
      statusEl.textContent = "File is too large for this demo (max 200KB).";
      selectedFile = null;
      return;
    }

    btnFormat.disabled = false;
    statusEl.textContent = `Selected: ${selectedFile.name} (${selectedFile.size} bytes)`;
  });

  btnFormat.addEventListener("click", async () => {
    if (!selectedFile) return;

    btnFormat.disabled = true;
    statusEl.textContent = "Sending text to the API...";

    try {
      const text = await selectedFile.text();

      const res = await fetch("/api/sentencecase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      outputEl.value = data.result ?? "";
      btnCopy.disabled = outputEl.value.length === 0;

      statusEl.textContent = "Done.";
    } catch (err) {
      statusEl.textContent = `Failed: ${err.message}`;
    } finally {
      btnFormat.disabled = !selectedFile;
    }
  });

  btnCopy.addEventListener("click", async () => {
    await navigator.clipboard.writeText(outputEl.value);
    statusEl.textContent = "Copied output to clipboard.";
  });
}