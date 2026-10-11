import { type NextRequest, NextResponse } from "next/server"
import { cabecerasAdmin } from "@/lib/admin-token"
// Safari de iOS rompe `req.formData()`: se reenvian los bytes tal cual.
import { reenviarAlPhp } from "@/lib/reenviar-multipart"

const PHP_URL = process.env.NEXT_PUBLIC_API_BASE_URL + "/delete_gift_card_purchase.php"

export async function POST(req: NextRequest) {
  try {
    const res = await reenviarAlPhp(req, PHP_URL, cabecerasAdmin())
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
