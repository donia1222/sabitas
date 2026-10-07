import "server-only"

/**
 * Las categorias, leidas desde el servidor.
 *
 * Las usa la pantalla de cada categoria para su titulo y el mapa del sitio.
 * No pasa por las rutas de app/api/ a proposito: esto corre en el servidor y
 * una vuelta de mas por nuestra propia API solo añadiria latencia.
 */
export interface CategoriaServidor {
  id: number
  slug: string
  name: string
  parent_id: number | null
}

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")

export async function leerCategorias(): Promise<CategoriaServidor[]> {
  if (!BASE) return []
  try {
    const res = await fetch(`${BASE}/get_categories.php`, {
      // Una hora: las categorias cambian de Pascuas a Ramos y esto se pide en
      // cada pagina de categoria y en el mapa del sitio.
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const datos = await res.json()
    const lista = datos?.categories ?? datos?.data ?? []
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

/** Busca una categoria por su slug, sin distinguir mayusculas. */
export async function buscarCategoria(slug: string) {
  const todas = await leerCategorias()
  return todas.find((c) => c.slug?.toLowerCase() === slug.toLowerCase()) ?? null
}
