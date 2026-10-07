import type { Metadata } from "next"

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")

/**
 * El titulo y la descripcion de cada producto, leidos del servidor.
 *
 * Importa mas de lo que parece: estas son las direcciones que la gente comparte
 * por WhatsApp. Sin esto, las once piezas se enseñaban todas como «Sabitas ·
 * Handgemachte Unikate», sin decir cual.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params
  if (!BASE || !/^\d+$/.test(id)) return { title: "Sabitas" }

  try {
    const res = await fetch(`${BASE}/get_products.php?id=${id}`, { next: { revalidate: 600 } })
    if (!res.ok) return { title: "Sabitas" }
    const datos = await res.json()
    const p = datos?.product ?? datos
    const nombre = typeof p?.name === "string" ? p.name.trim() : ""
    if (!nombre) return { title: "Sabitas" }

    const descripcion = (typeof p?.description === "string" && p.description.trim())
      ? p.description.trim().slice(0, 160)
      : `${nombre} – handgemachtes Unikat von Sabitas, genäht in der Schweiz.`
    const foto = typeof p?.image_url === "string" ? p.image_url : undefined

    return {
      title: `${nombre} · Sabitas`,
      description: descripcion,
      openGraph: {
        title: `${nombre} · Sabitas`,
        description: descripcion,
        images: foto ? [{ url: foto }] : undefined,
      },
    }
  } catch {
    return { title: "Sabitas" }
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
