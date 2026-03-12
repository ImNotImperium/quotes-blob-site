import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"; 

import { BlobServiceClient } from "@azure/storage-blob"; 

  

app.http("quote", { 

  methods: ["GET"], 

  authLevel: "anonymous", 

  route: "quote", 

  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => { 

    const cs = process.env.QUOTES_STORAGE; 

    if (!cs) return { status: 500, jsonBody: { error: "Missing QUOTES_STORAGE app setting" } }; 

  

    const blobService = BlobServiceClient.fromConnectionString(cs); 

  

    // These must match what you created in Storage 

    const containerName = "data"; 

    const blobName = "quotes.json"; 

  

    try { 

      const containerClient = blobService.getContainerClient(containerName); 

      const blobClient = containerClient.getBlobClient(blobName); 

  

      const download = await blobClient.download(); 

      const jsonText = await streamToString(download.readableStreamBody); 

      const parsed = JSON.parse(jsonText); 

  

      const quotes: string[] = Array.isArray(parsed?.quotes) ? parsed.quotes : []; 

      if (quotes.length === 0) { 

        return { status: 500, jsonBody: { error: "No quotes found in quotes.json" } }; 

      } 

  

      const quote = quotes[Math.floor(Math.random() * quotes.length)]; 

      return { status: 200, jsonBody: { quote } }; 

    } catch (err: any) { 

      return { status: 500, jsonBody: { error: String(err?.message ?? err) } }; 

    } 

  } 

}); 

  

async function streamToString(stream?: NodeJS.ReadableStream | null): Promise<string> { 

  if (!stream) return ""; 

  const chunks: Buffer[] = []; 

  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); 

  return Buffer.concat(chunks).toString("utf-8"); 

} 