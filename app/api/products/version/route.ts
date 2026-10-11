import { NextResponse } from "next/server"
import { phpFetch } from "@/lib/php-queue"

/**
 * La huella del catálogo.
 *
 * Un texto que cambia en cuanto se edita, se crea o se borra un producto.
 * Las pantallas lo piden antes de fiarse de lo que tienen guardado: si la
 * huella es la misma, usan su copia; si ha cambiado, la tiran.
 *
 * Es barata (un COUNT y dos MAX) y por eso puede pedirse en cada carga. No
 * lleva caché por ningún lado, ni aquí ni en el PHP: una huella con caché no
 * sirve para nada.
 *
 * Si falla, no es grave: se contesta sin versión y quien pregunta vuelve a
 * medirse por reloj, que es como se hacía antes.
 */
export const dynamic = "force-dynamic"

const PHP = process.env.NEXT_PUBLIC_API_BASE_URL + "/products_version.php"

const SIN_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
}

export async function GET() {
  try {
    const res = await phpFetch(PHP, { cache: "no-store" })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    return NextResponse.json(data, { headers: SIN_CACHE })
  } catch {
    return NextResponse.json({ success: false }, { headers: SIN_CACHE })
  }
}
