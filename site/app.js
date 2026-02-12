// Replace this with your Function App base URL after you deploy the function.
// Example: https://quotesapp-abcdefg.azurewebsites.net
const FUNCTION_BASE_URL = "https://quotesappra1064-cweubscvg5gmhne7.francecentral-01.azurewebsites.net";

const btn = document.getElementById("btn");
const quoteEl = document.getElementById("quote");
const statusEl = document.getElementById("status");

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
 