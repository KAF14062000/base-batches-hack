import fetch from "node-fetch";

const DEFAULT_BASE = "https://ollama.com/api";

const buildHeaders = () => {
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OLLAMA_API_KEY");
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
};

export async function chat({
  messages,
  images = [],
  schema,
  jsonMode = false,
  stream = false,
}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("messages array is required");
  }

  const preparedMessages = messages.map((message) => ({ ...message }));
  if (images.length > 0) {
    const firstUserIndex = preparedMessages.findIndex(
      (message) => message.role === "user",
    );
    if (firstUserIndex >= 0) {
      const incoming = preparedMessages[firstUserIndex].images || [];
      preparedMessages[firstUserIndex].images = [...incoming, ...images];
    } else {
      preparedMessages.push({
        role: "user",
        content: "",
        images,
      });
    }
  }

  const body = {
    model: "qwen3-vl:235b-cloud",
    messages: preparedMessages,
    stream,
  };

  if (schema) {
    body.format = schema;
  } else if (jsonMode) {
    body.format = "json";
  }

  const base = process.env.OLLAMA_API_BASE || DEFAULT_BASE;
  const response = await fetch(`${base}/chat`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }

  if (stream) {
    return response.body;
  }

  return response.json();
}
