import { NextRequest, NextResponse } from "next/server"

const PHP = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") + "/add_product.php"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const res = await fetch(PHP, { method: "POST", body: formData })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
