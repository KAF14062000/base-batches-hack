import { z } from "zod"

type BaseMessage = {
  role: "system" | "user" | "assistant"
  content: string
  images?: string[]
}

const OLLAMA_URL = "https://ollama.com/v1/chat/completions"
const MODEL_NAME = "qwen3-vl:235b-cloud"

function encodeImageContent(content: BaseMessage["content"], images: string[] | undefined) {
  if (!images?.length) {
    return content
  }

  return [
    { type: "text", text: content },
    ...images.map((image) => ({
      type: "image_url" as const,
      image_url: { url: image.startsWith("data:") ? image : `data:image/png;base64,${image}` },
    })),
  ]
}

function decodeJsonMessage(message?: unknown) {
  if (!message || typeof message !== "object") {
    throw new Error("LLM response missing message payload")
  }

  const content = (message as { content?: string }).content
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("LLM response did not include JSON content")
  }

  try {
    return JSON.parse(content)
  } catch {
    throw new Error("Failed to parse LLM JSON content")
  }
}

function assertApiKey(): string {
  const apiKey = process.env.OLLAMA_API_KEY
  if (!apiKey) {
    throw new Error("Missing OLLAMA_API_KEY environment variable")
  }
  return apiKey
}

export async function chatJSON<T>(
  schema: z.ZodTypeAny,
  messages: Array<BaseMessage>,
): Promise<T> {
  const apiKey = assertApiKey()

  const payload = {
    model: MODEL_NAME,
    messages: messages.map((message) => ({
      role: message.role,
      content: encodeImageContent(message.content, message.images),
    })),
    response_format: { type: "json_object" },
  }

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LLM request failed (${response.status}): ${errorText || response.statusText}`)
  }

  const result = await response.json()
  const data = decodeJsonMessage(result?.choices?.[0]?.message)

  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    throw new Error("LLM response did not match expected schema")
  }

  return parsed.data as T
}

export type ChatMessage = BaseMessage
