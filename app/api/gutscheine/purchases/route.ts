import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const PHP_URL = process.env.NEXT_PUBLIC_API_BASE_URL + "/get_gift_card_purchases.php"

export async function GET() {
  try {
    const res = await fetch(PHP_URL, { cache: "no-store" })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
