import { NextRequest, NextResponse } from "next/server"

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")

export async function GET() {
  try {
    const res = await fetch(`${BASE}/get_shipping_settings.php`, { next: { revalidate: 120 } })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${BASE}/save_shipping_settings.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
