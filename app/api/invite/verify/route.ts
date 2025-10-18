import { NextResponse } from "next/server"

import { verifyInviteToken } from "@/lib/invite"

export const runtime = "edge"
export const preferredRegion = "auto"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  if (!token) {
    return NextResponse.json({ message: "Missing invite token" }, { status: 400 })
  }

  try {
    const payload = await verifyInviteToken(token)
    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid invite token"
    const status = message.includes("INVITE_SECRET") ? 500 : 400
    return NextResponse.json({ message }, { status })
  }
}
