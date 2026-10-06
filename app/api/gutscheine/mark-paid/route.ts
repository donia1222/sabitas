import { type NextRequest, NextResponse } from "next/server"

const PHP_URL = process.env.NEXT_PUBLIC_API_BASE_URL + "/mark_gift_card_paid.php"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(PHP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
