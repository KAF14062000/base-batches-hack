import { NextResponse } from "next/server"
import { z } from "zod"

import { signInvitePayload } from "@/lib/invite"
import { InvitePayload, groupSchema, ocrDocSchema } from "@/lib/schemas"

export const runtime = "edge"
export const preferredRegion = "auto"

const requestSchema = z.object({
  group: groupSchema,
  expense: ocrDocSchema,
  expenseId: z.string().min(1),
})

export async function POST(request: Request) {
  let payload: z.infer<typeof requestSchema>
  try {
    payload = requestSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 })
  }

  try {
    const timestamp = new Date().toISOString()
    const itemsWithIds = payload.expense.items.map((item, index) => ({
      id: `${index}-${crypto.randomUUID()}`,
      ...item,
    }))

    const invitePayload: InvitePayload = {
      groupId: payload.group.id,
      groupName: payload.group.name,
      payerId: payload.group.payerId,
      members: payload.group.members,
      expenseId: payload.expenseId,
      createdAt: timestamp,
      expense: {
        ...payload.expense,
        items: itemsWithIds,
      },
    }

    const token = await signInvitePayload(invitePayload)
    const inviteUrl = new URL("/join", request.url)
    inviteUrl.searchParams.set("token", token)

    return NextResponse.json({
      token,
      inviteUrl: inviteUrl.toString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create invite"
    const status = message.includes("INVITE_SECRET") ? 500 : 502
    return NextResponse.json({ message }, { status })
  }
}
