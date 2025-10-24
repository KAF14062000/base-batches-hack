import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    // Prefer Vercel’s edge headers when available
    const countryHeader =
      request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry") ||
      null;

    if (countryHeader) {
      const code = countryHeader.toUpperCase();
      return NextResponse.json({ country_code: code, country: code }, { status: 200 });
    }

    // Fallback: try IP-based lookup if an external token is provided
    const token = process.env.IPINFO_TOKEN;
    if (token) {
      const forwarded = request.headers.get("x-forwarded-for") || "";
      const ip = (forwarded.split(",")[0] || "").trim() || request.headers.get("x-real-ip") || "";
      const targetIp = ip || "8.8.8.8"; // safe fallback if IP missing
      const url = `https://ipinfo.io/${encodeURIComponent(targetIp)}?token=${encodeURIComponent(token)}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        const code: string | null = (data.country as string) || null; // ipinfo returns 'country' as ISO code
        return NextResponse.json({ country_code: code, country: code }, { status: 200 });
      }
    }

    // Last resort: unknown
    return NextResponse.json({ country_code: null, country: null }, { status: 200 });
  } catch (error) {
    console.error("Error in geolocation route:", error);
    return NextResponse.json({ country_code: null, country: null }, { status: 200 });
  }
}
