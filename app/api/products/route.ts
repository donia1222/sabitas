import { NextRequest, NextResponse } from "next/server"
import { isPhpBlocked, reportPhpError, clearPhpBlock } from "@/lib/php-guard"
import { phpFetch } from "@/lib/php-queue"
import { cache } from "./cache"

const PHP_BASE = process.env.NEXT_PUBLIC_API_BASE_URL + "/get_products.php"
// Un minuto. Esta cache y la del navegador se suman, y el PHP tiene ademas la
// suya propia de fichero, que es la que de verdad protege al servidor de que
// le pidan la lista mil veces. Ver el comentario de lib/products-cache.ts.
const CACHE_TTL = 60_000

const inflight = new Map<string, Promise<unknown>>()

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  // _= es cache-buster del admin: quiere datos frescos
  const bustCache = params.has("_")
  params.delete("_")
  /**
   * v= es la huella del catálogo que trae quien pregunta.
   *
   * Si no coincide con la de nuestra copia, nuestra copia es de antes del
   * último cambio y no vale, por reciente que sea. Esto es lo que hace que
   * una foto editada se vea al momento: antes esta copia vivía cinco minutos
   * por reloj y no había manera de decirle que el catálogo había cambiado.
   *
   * No entra en la clave del caché: si entrara, cada versión dejaría una
   * entrada nueva y el mapa crecería sin parar. Se guarda junto al dato.
   */
  const huella = params.get("v")
  params.delete("v")
  const qs = params.toString()
  const hit = cache.get(qs)
  const caducada = !!huella && !!hit && hit.version !== huella

  // Al hacer bust —o cuando la huella no cuadra— pasar ?_ a PHP para que
  // también invalide su caché de archivo, que es otros cinco minutos.
  const alPHP = bustCache || caducada
  const phpQs = alPHP ? (qs ? `_=1&${qs}` : `_=1`) : qs
  const url = phpQs ? `${PHP_BASE}?${phpQs}` : PHP_BASE

  // 1. Caché fresco, y de después del último cambio
  if (!bustCache && !caducada && hit && Date.now() - hit.at < CACHE_TTL) {
    return NextResponse.json(hit.data)
  }

  /**
   * 2. Producto por ID: si la lista completa está en caché y vale, servir desde ahí.
   *
   * ATENCIÓN con el `!bustCache`. Antes esta rama se saltaba el cache-buster
   * a propósito («si la lista ya es fresca no hay que ir a PHP»), y eso es lo
   * que rompía el panel: al abrir un producto para editarlo se pide
   * `?id=X&_=<ahora>` justo para tener lo último, y aquí se le contestaba con
   * una copia de hasta cinco minutos antes. Resultado: guardabas, la
   * miniatura salía bien —esa se parchea en memoria—, y al volver a abrir el
   * modal aparecían la foto y los textos viejos.
   *
   * Quien pone `_` está diciendo «no me des nada guardado». Hay que hacerle
   * caso. Es una petición sola, de una persona que está editando: no es
   * tráfico que haya que ahorrarle al PHP.
   */
  if (!bustCache && params.has("id") && params.size === 1) {
    const productId = String(params.get("id"))
    const fullList = cache.get("")
    const listaVale = fullList && (!huella || fullList.version === huella)
    if (listaVale && fullList && Date.now() - fullList.at < CACHE_TTL) {
      const full = fullList.data as any
      const product = full?.products?.find((p: any) => String(p.id) === productId)
      if (product) return NextResponse.json({ success: true, product })
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }
  }

  // 3. Guard global: aplica siempre, incluyendo cache-busters del admin.
  //    Si PHP está caído, datos stale son mejor que un 502 que desencadena más intentos.
  if (isPhpBlocked()) {
    if (hit) return NextResponse.json(hit.data)
    return NextResponse.json({ success: false, error: "rate limited" }, { status: 429 })
  }

  // 4. Single-flight: si ya hay un fetch en curso para esta key, esperar al mismo
  const existing = inflight.get(qs)
  if (!bustCache && !caducada && existing) {
    try {
      const data = await existing
      return NextResponse.json(data)
    } catch {
      if (hit) return NextResponse.json(hit.data)
      return NextResponse.json({ success: false, error: "upstream error" }, { status: 502 })
    }
  }

  const promise = phpFetch(url, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      cache.set(qs, { data, at: Date.now(), version: huella })
      clearPhpBlock()
      return data
    })
    .catch((e) => {
      reportPhpError(parseInt(e.message) || 0)
      throw e
    })
    .finally(() => inflight.delete(qs))

  if (!bustCache && !caducada) inflight.set(qs, promise)

  try {
    const data = await promise
    return NextResponse.json(data)
  } catch (e: any) {
    if (hit) return NextResponse.json(hit.data)
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
