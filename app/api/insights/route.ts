import { NextResponse } from "next/server"
import { z } from "zod"

import { chatJSON } from "@/lib/llm"
import { expenseHistorySchema, insightsSchema } from "@/lib/schemas"

export const runtime = "edge"
export const preferredRegion = "auto"

const requestSchema = z.object({
  history: expenseHistorySchema,
})

const systemPrompt = `You analyze shared expenses and identify actionable insights.
Return valid JSON with:
- findings: up to 3 short sentences highlighting trends or anomalies.
- tips: exactly 2 practical cost-saving suggestions.
Be concise, friendly, and reference categories when useful.`

export async function POST(request: Request) {
  let payload: z.infer<typeof requestSchema>
  try {
    payload = requestSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 })
  }

  try {
    const response = await chatJSON(insightsSchema, [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: "Generate insights using the provided expense history JSON.",
      },
      {
        role: "user",
        content: JSON.stringify(payload.history),
      },
    ])
    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Insight generation failed"
    const status = message.includes("OLLAMA_API_KEY") ? 500 : 502
    return NextResponse.json({ message }, { status })
  }
}
