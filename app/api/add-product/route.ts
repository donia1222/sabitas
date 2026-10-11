import { NextRequest, NextResponse } from "next/server"
import { cabecerasAdmin } from "@/lib/admin-token"
// Safari de iOS rompe `req.formData()`: se reenvian los bytes tal cual.
import { reenviarAlPhp } from "@/lib/reenviar-multipart"

const PHP = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") + "/add_product.php"

export async function POST(req: NextRequest) {
  try {
    const res = await reenviarAlPhp(req, PHP, cabecerasAdmin())
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
