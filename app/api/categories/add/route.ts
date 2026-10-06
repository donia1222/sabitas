import { NextRequest, NextResponse } from "next/server"
import { clearCache } from "../cache"

const PHP_URL = process.env.NEXT_PUBLIC_API_BASE_URL + "/add_category.php"

export async function POST(req: NextRequest) {
  try {
    // Reenviar como multipart (conserva la imagen si la hay)
    const formData = await req.formData()

    const res = await fetch(PHP_URL, {
      method: "POST",
      body: formData,
    })
    const text = await res.text()
    const data = JSON.parse(text)
    if (data.success) clearCache()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
