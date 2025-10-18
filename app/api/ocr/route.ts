import { NextResponse } from "next/server"
import { z } from "zod"

import { chatJSON } from "@/lib/llm"
import { ocrDocSchema } from "@/lib/schemas"

export const runtime = "edge"
export const preferredRegion = "auto"

const requestSchema = z.object({
  imageBase64: z.string().min(1, "imageBase64 required"),
})

const systemPrompt = `You are an OCR assistant that extracts structured data from receipt images.
Return ONLY JSON that matches the provided schema with no extra keys.
Rules:
- merchant: string, title case.
- date: ISO 8601 if possible, otherwise raw text.
- currency: three letter code when obvious, otherwise symbol or text.
- items: include every purchasable line item with category in {food, drinks, utilities, transport, entertainment, other}.
- subtotal, tax, total: infer missing values when possible.
Ensure numeric fields are numbers, not strings.`

export async function POST(request: Request) {
  let body: z.infer<typeof requestSchema>
  try {
    body = requestSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 })
  }

  try {
    const result = await chatJSON(ocrDocSchema, [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: "Extract the structured receipt data from this image. Respond with valid JSON only.",
        images: [body.imageBase64],
      },
    ])
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process receipt"
    const status = message.includes("OLLAMA_API_KEY") ? 500 : 502
    return NextResponse.json({ message }, { status })
  }
}
