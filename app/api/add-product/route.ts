import { NextRequest, NextResponse } from "next/server"
import { cabecerasAdmin } from "@/lib/admin-token"
// Safari de iOS rompe `req.formData()`: se reenvian los bytes tal cual.
import { reenviarAlPhp } from "@/lib/reenviar-multipart"

const PHP = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") + "/add_product.php"

export async function POST(req: NextRequest) {
  try {
    const res = await reenviarAlPhp(req, PHP, cabecerasAdmin())
    const crudo = await res.text()

    // El motivo que da el PHP se pasa tal cual. Antes se tiraba y se mandaba
    // solo el numero —«error: 400»—, que no dice nada a nadie: el 11/10/2026
    // costo un intento entero averiguar que detras de ese 400 habia un «falta
    // el nombre del producto».
    try {
      const data = JSON.parse(crudo)
      return NextResponse.json(data, { status: res.ok ? 200 : res.status })
    } catch {
      return NextResponse.json(
        { success: false, error: `Respuesta inesperada del servidor (HTTP ${res.status})`, php: crudo.slice(0, 300) },
        { status: 502 },
      )
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
