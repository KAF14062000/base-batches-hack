import { Ollama } from "ollama";
import { config } from "dotenv"
config()

const DEFAULT_HOST = "https://ollama.com";
const DEFAULT_MODEL = "qwen3-vl:235b-cloud";
const USER_AGENT = "SplitBase/1.0 (apps/api)";

function toStringContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string"
          ? part
          : typeof part?.text === "string"
            ? part.text
            : "",
      )
      .filter(Boolean)
      .join("\n\n");
  }
  if (content && typeof content.text === "string") return content.text;
  return "";
}

function buildMessages(messages, images = []) {
  const out = (messages || []).map((m) => {
    if (!m || !m.role) throw new Error("Each message must include a role");
    const msg = {
      role: m.role,
      content: toStringContent(m.content),
    };
    if (Array.isArray(m.images) && m.images.length)
      msg.images = m.images.map(normalizeImageRef);
    return msg;
  });

  if (images?.length) {
    const firstUser = out.find((m) => m.role === "user");
    const extra = images.map(normalizeImageRef);
    if (firstUser) firstUser.images = [...(firstUser.images || []), ...extra];
    else out.push({ role: "user", content: "", images: extra });
  }
  return out;
}

function normalizeImageRef(ref) {
  if (!ref) return ref;
  // Accept data URLs; convert to the raw base64 payload string
  if (typeof ref === "string" && ref.startsWith("data:")) {
    const idx = ref.indexOf(",");
    return idx !== -1 ? ref.slice(idx + 1) : ref;
  }
  return ref; // absolute file path or base64 string
}

export async function chat({
  messages,
  images = [],
  schema,
  jsonMode = false,
  stream = false,
  model = DEFAULT_MODEL,
  options,
}) {
  if (!Array.isArray(messages) || messages.length === 0)
    throw new Error("messages array is required");

  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) throw new Error("Missing OLLAMA_API_KEY");
  const host = process.env.OLLAMA_API_BASE || DEFAULT_HOST;

  const client = new Ollama({
    host,
    headers: { Authorization: `Bearer ${apiKey}`, "User-Agent": USER_AGENT },
  });

  const payload = {
    model,
    messages: buildMessages(messages, images),
    stream,
  };
  if (schema) payload.format = schema;
  else if (jsonMode) payload.format = "json";
  if (options && typeof options === "object") payload.options = options;

  try {
    const response = await client.chat(payload);
    if (!stream) return response;

    const isIterable = typeof response?.[Symbol.asyncIterator] === "function";
    if (!isIterable)
      throw new Error("Expected streaming response to be async iterable");
    return response;
  } catch (error) {
    const summary = {
      model,
      stream,
      format: payload.format ?? null,
      roles: payload.messages.map((m) => m.role),
    };
    const details = [
      `Ollama request failed for POST ${host}/chat`,
      `payload summary: ${JSON.stringify(summary)}`,
      error?.message ? `inner error: ${error.message}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    throw new Error(details);
  }
}

// Convenience: enforce JSON return using schema or json mode and parse it.
export async function chatJSON({ schema, ...rest }) {
  const res = await chat({
    ...rest,
    schema: schema ?? undefined,
    jsonMode: !schema,
  });
  // SDK returns { message: { content } } for non-streaming
  const text = res?.message?.content ?? (typeof res === "string" ? res : "");
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(
      `Failed to parse JSON from model output: ${e?.message || e}`,
    );
  }
}
