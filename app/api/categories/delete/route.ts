import { NextRequest, NextResponse } from "next/server"
import { clearCache } from "../cache"

const PHP_URL = process.env.NEXT_PUBLIC_API_BASE_URL + "/delete_category.php"

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const res = await fetch(PHP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
    const text = await res.text()
    const data = JSON.parse(text)
    if (data.success) clearCache()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
