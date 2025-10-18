import { invitePayloadSchema, type InvitePayload } from "./schemas"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toUint8Array(data: ArrayBuffer | Uint8Array) {
  return data instanceof Uint8Array ? data : new Uint8Array(data)
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ""
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function importSecret(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ])
}

function requireSecret(secret = process.env.INVITE_SECRET) {
  if (!secret) {
    throw new Error("Missing INVITE_SECRET environment variable")
  }
  return secret
}

export async function signInvitePayload(payload: InvitePayload, secret?: string) {
  const key = await importSecret(requireSecret(secret))
  const normalized = invitePayloadSchema.parse(payload)
  const dataBytes = encoder.encode(JSON.stringify(normalized))
  const signature = toUint8Array(await crypto.subtle.sign("HMAC", key, dataBytes))

  return `${toBase64Url(dataBytes)}.${toBase64Url(signature)}`
}

export async function verifyInviteToken(token: string, secret?: string): Promise<InvitePayload> {
  const [dataPart, signaturePart] = token.split(".")
  if (!dataPart || !signaturePart) {
    throw new Error("Invalid invite token")
  }

  const key = await importSecret(requireSecret(secret))
  const payloadBytes = fromBase64Url(dataPart)
  const signatureBytes = fromBase64Url(signaturePart)
  const valid = await crypto.subtle.verify("HMAC", key, signatureBytes, payloadBytes)
  if (!valid) {
    throw new Error("Invalid invite token signature")
  }

  const json = decoder.decode(payloadBytes)
  const parsed = invitePayloadSchema.safeParse(JSON.parse(json))
  if (!parsed.success) {
    throw new Error("Invite token payload malformed")
  }
  return parsed.data
}
