import type { MetadataRoute } from "next"
import { leerCategorias } from "@/lib/categorias-servidor"

const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || "https://sabitas.vercel.app").replace(/\/$/, "")

/**
 * El mapa del sitio: la lista de paginas que Google debe conocer.
 *
 * Las categorias se añaden solas, asi que el dia que ella cree una nueva desde
 * el panel aparece aqui sin que nadie toque nada.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ahora = new Date()

  const fijas: MetadataRoute.Sitemap = [
    { url: `${SITIO}/`,           lastModified: ahora, changeFrequency: "weekly",  priority: 1 },
    { url: `${SITIO}/shop`,       lastModified: ahora, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${SITIO}/gallery`,    lastModified: ahora, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITIO}/blog`,       lastModified: ahora, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${SITIO}/ueber-mich`, lastModified: ahora, changeFrequency: "yearly",  priority: 0.6 },
    { url: `${SITIO}/kontakt`,    lastModified: ahora, changeFrequency: "yearly",  priority: 0.6 },
  ]

  const categorias = await leerCategorias()
  const deCategoria: MetadataRoute.Sitemap = categorias
    .filter((c) => c.slug)
    .map((c) => ({
      url: `${SITIO}/kollektion/${c.slug}`,
      lastModified: ahora,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))

  return [...fijas, ...deCategoria]
}
