import { type NextRequest, NextResponse } from "next/server"

const PHP_URL = process.env.NEXT_PUBLIC_API_BASE_URL + "/add_gift_card.php"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const params = new URLSearchParams()
    formData.forEach((value, key) => params.append(key, value.toString()))

    const res = await fetch(PHP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
