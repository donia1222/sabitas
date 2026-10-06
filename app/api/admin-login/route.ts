import { NextRequest, NextResponse } from "next/server"

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")

/**
 * Puerta de entrada al panel: el navegador manda aqui el email y la clave y
 * esta ruta se lo pasa al PHP, que es quien tiene las credenciales (viven en
 * secure_config/almacen.php, fuera de www). Ni el email ni la contrasena
 * correctos llegan nunca al navegador.
 */
export async function POST(req: NextRequest) {
  if (!BASE) {
    return NextResponse.json(
      { success: false, error: "API nicht konfiguriert" },
      { status: 503 },
    )
  }
  try {
    const body = await req.text()
    const res = await fetch(`${BASE}/admin_login.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({ success: false, error: "Serverfehler" }))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: "Serverfehler" }, { status: 502 })
  }
}
