import { NextRequest, NextResponse } from "next/server"

const PHP = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") + "/get_ordersuser.php"

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString()
  const url = qs ? `${PHP}?${qs}` : PHP
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
