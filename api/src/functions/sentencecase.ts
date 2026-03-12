import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"; 

 

type Body = { text?: string }; 

 

function toSentenceCase(input: string): string { 

  // Convert everything to lower case first, then capitalise sentence starts 

  const chars = input.toLowerCase().split(""); 

 

  let capNext = true; 

 

  for (let i = 0; i < chars.length; i++) { 

    const c = chars[i]; 

 

    // Capitalise the next alphabetic character after a sentence boundary 

    if (capNext && c >= "a" && c <= "z") { 

      chars[i] = c.toUpperCase(); 

      capNext = false; 

      continue; 

    } 

 

    // Sentence boundaries 

    if (c === "." || c === "!" || c === "?") { 

      capNext = true; 

      continue; 

    } 

 

    // Optional: treat new line as a fresh start 

    if (c === "\n") { 

      capNext = true; 

    } 

  } 

 

  return chars.join(""); 

} 

 

export async function sentencecase( 

  request: HttpRequest, 

  context: InvocationContext 

): Promise<HttpResponseInit> { 

  try { 

    const body = (await request.json()) as Body; 

 

    const text = body?.text ?? ""; 

    if (!text || typeof text !== "string") { 

      return { status: 400, jsonBody: { error: "Missing 'text' in JSON body." } }; 

    } 

 

    // Safety limit for classroom demo 

    if (text.length > 200_000) { 

      return { status: 413, jsonBody: { error: "Text too large for this demo." } }; 

    } 

 

    const result = toSentenceCase(text); 

    return { status: 200, jsonBody: { result } }; 

  } catch { 

    return { status: 400, jsonBody: { error: "Invalid JSON body." } }; 

  } 

} 

 

app.http("sentencecase", { 

  methods: ["POST"], 

  authLevel: "anonymous", 

  route: "sentencecase", 

  handler: sentencecase 

}); 