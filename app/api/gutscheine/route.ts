import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL

export async function GET(req: NextRequest) {
  try {
    const all = req.nextUrl.searchParams.get("all") ?? "0"
    const res = await fetch(`${BASE}/get_gift_cards.php?all=${all}`, { cache: "no-store" })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
