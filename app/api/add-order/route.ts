import { NextRequest, NextResponse } from "next/server"

const PHP = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") + "/add_order.php"

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const res = await fetch(PHP, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
