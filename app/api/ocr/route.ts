import { NextResponse } from "next/server"
import { z } from "zod"

import { chatJSON } from "@/lib/llm"
import { ocrDocSchema } from "@/lib/schemas"

export const runtime = "edge"
export const preferredRegion = "auto"

const requestSchema = z.object({
  imageBase64: z.string().min(1, "imageBase64 required"),
  countryCode: z.string().optional(),
  country: z.string().optional(),
})


const systemPrompt = `You are an OCR assistant that extracts structured data from receipt images.
Return ONLY JSON that matches the provided schema with no extra keys.
Here is the schema:

{
  "merchant": "string (non-empty)",
  "date": "string (date ISO or raw text)",
  "currency": "string (e.g. \"INR\", \"USD\")",
  "items": [
    {
      "name": "string",
      "qty": "number (optional)",
      "price": "number (non-negative)",
      "category": "one of [food, drinks, utilities, transport, entertainment, other]"
    }
  ],
  "subtotal": "number (non-negative)",
  "tax": "number (non-negative)",
  "service_charge": "number (non-negative, if found)",
  "sgst": "number (non-negative, if found)",
  "cgst": "number (non-negative, if found)",
  "discount": "number (non-negative, optional)",
  "total": "number (non-negative)",
  "notes": "string (optional)"
}

Rules:
- Use title case for merchant.
- Use ISO 8601 format for date if possible.
- Use three-letter currency codes when obvious.
- Numeric fields must be numbers (not strings).
- Do not include any extra keys.
`;

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
        content: `Extract the structured receipt data from this image.
                  ${body.country != '' ? `We know the user is from ${body.country}.
                  and their country code is ${body.countryCode}. In case the currecy is unclear from the
                  image, use ${body.country}'s currency.` : ''} Respond with valid JSON only.`,
        images: [body.imageBase64]
      },
    ])
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process receipt"
    const status = message.includes("OLLAMA_API_KEY") ? 500 : 502
    return NextResponse.json({ message }, { status })
  }
}
