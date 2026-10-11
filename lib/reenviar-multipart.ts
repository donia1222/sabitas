import { NextRequest } from "next/server"

/**
 * Reenviar un formulario al PHP SIN leerlo por el camino.
 *
 * Por que existe esto (11/10/2026, encontrado por el con el cartel de
 * diagnostico en el movil):
 *
 *   HTTP 502 · {"success":false,"error":"Failed to parse body as FormData."}
 *
 * Ese error no lo da el PHP. Lo da Next al ejecutar `await req.formData()`.
 * Safari de iOS 18.7 (Version/27.2) arma el multipart de una manera que el
 * parser de Node rechaza, y la peticion se moria ahi: ni llegaba al PHP, ni
 * se guardaba nada, y en el movil no habia consola donde verlo. En Chrome y
 * en Safari del Mac el mismo formulario y la misma foto pasaban sin problema.
 *
 * La solucion es no parsear. Estas rutas no necesitan mirar dentro del
 * formulario: solo lo pasan al PHP. Asi que se reenvian **los bytes tal cual**
 * con su `Content-Type` original —boundary incluido— y lo parsea PHP, que
 * lleva veinte años haciendolo y no se atraganta.
 *
 * De paso es mas rapido y gasta menos memoria: no se arma un FormData en
 * Node para volver a serializarlo acto seguido.
 *
 * Se lee entero a un buffer en vez de ir en streaming a proposito: Vercel ya
 * corta a ~4,5 MB, asi que nunca es grande, y un buffer se porta igual en
 * todos lados sin depender de `duplex: "half"`.
 */
export async function reenviarAlPhp(
  req: NextRequest,
  url: string,
  cabeceras: HeadersInit = {},
): Promise<Response> {
  const { body, headers } = await cuerpoCrudo(req, cabeceras)
  return fetch(url, { method: "POST", headers, body })
}

/**
 * Lo mismo, pero devolviendo las piezas en vez de hacer la peticion.
 *
 * Es para las rutas que tienen que pasar por `phpFetch` —la cola que impide
 * que se le manden varias peticiones a la vez al PHP compartido—. Esa cola no
 * se toca, asi que aqui solo se prepara lo que hay que mandarle.
 */
export async function cuerpoCrudo(
  req: NextRequest,
  cabeceras: HeadersInit = {},
): Promise<{ body: ArrayBuffer; headers: Headers }> {
  const body = await req.arrayBuffer()

  const headers = new Headers(cabeceras)
  // El Content-Type ORIGINAL es imprescindible: lleva el boundary con el que
  // el navegador separo los campos. Sin el, PHP no sabe por donde cortar.
  const tipo = req.headers.get("content-type")
  if (tipo) headers.set("content-type", tipo)

  return { body, headers }
}
