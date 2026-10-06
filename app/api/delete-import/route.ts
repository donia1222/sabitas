export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: "No se proporcionaron IDs" }, { status: 400 })
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL
    const phpResponse = await fetch(`${apiBase}/delete_import.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })

    const result = await phpResponse.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error eliminando importación:", error)
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
  }
}
