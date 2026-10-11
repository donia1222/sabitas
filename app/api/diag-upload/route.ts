import { NextRequest, NextResponse } from "next/server"

/**
 * PROVISIONAL · 11/10/2026. Se quita cuando sepamos que pasa.
 *
 * No guarda nada, no toca la base de datos y no habla con el PHP. Solo
 * contesta QUE le ha llegado, byte a byte.
 *
 * Esta aqui porque desde su iPhone (iOS 18.7, Safari 27.2) una subida con
 * foto se muere sin dejar rastro util: primero Node no sabia leer el
 * formulario («Failed to parse body as FormData»), y despues, reenviando los
 * bytes crudos, el PHP contesta como si no le hubiera llegado ningun campo.
 * Que fallen los dos parsers apunta a que el cuerpo que arma ese Safari no es
 * el de siempre. Esto sirve para verlo.
 */
export async function POST(req: NextRequest) {
  const tipo = req.headers.get("content-type") ?? "(sin content-type)"

  // 1 · los bytes tal cual
  const bytes = new Uint8Array(await req.arrayBuffer())

  // 2 · el principio del cuerpo, con los saltos de linea A LA VISTA.
  //     Aqui esta la gracia: un multipart tiene que separar con CRLF (\r\n).
  //     Si Safari separa con LF a secas, ningun parser serio lo acepta.
  const cabeza = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 600))
  const visible = cabeza.replace(/\r/g, "«CR»").replace(/\n/g, "«LF»\n")

  // 3 · contar los saltos de cada clase en todo el cuerpo
  let cr = 0, lf = 0, crlf = 0
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 13) { cr++; if (bytes[i + 1] === 10) crlf++ }
    if (bytes[i] === 10) lf++
  }

  // 4 · y que opina el parser de Node del mismo cuerpo
  let queDiceNode: string
  try {
    const fd = await new Request("http://x", {
      method: "POST",
      headers: { "content-type": tipo },
      body: bytes,
    }).formData()
    const campos: string[] = []
    fd.forEach((v, k) => campos.push(k + (v instanceof File ? `=[fichero ${v.size}B]` : `="${String(v).slice(0, 40)}"`)))
    queDiceNode = `OK · ${campos.join(" · ")}`
  } catch (e: any) {
    queDiceNode = `FALLA · ${e?.name}: ${e?.message}`
  }

  return NextResponse.json({
    content_type: tipo,
    bytes_recibidos: bytes.length,
    saltos: { CR: cr, LF: lf, CRLF: crlf, "LF sueltos": lf - crlf },
    node_formdata: queDiceNode,
    primeros_600_bytes: visible,
  })
}
