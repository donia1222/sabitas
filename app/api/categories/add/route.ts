import { NextRequest, NextResponse } from "next/server"
import { cabecerasAdmin } from "@/lib/admin-token"
// Safari de iOS rompe `req.formData()`: se reenvian los bytes tal cual.
import { reenviarAlPhp } from "@/lib/reenviar-multipart"
import { clearCache } from "../cache"

const PHP_URL = process.env.NEXT_PUBLIC_API_BASE_URL + "/add_category.php"

export async function POST(req: NextRequest) {
  try {
    // Los bytes del formulario pasan enteros al PHP, con su boundary.
    const res = await reenviarAlPhp(req, PHP_URL, cabecerasAdmin())
    const text = await res.text()
    const data = JSON.parse(text)
    if (data.success) clearCache()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
