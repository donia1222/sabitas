import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import ShopGrid from "@/components/shop-grid"
import { buscarCategoria, leerCategorias } from "@/lib/categorias-servidor"

/**
 * Una pantalla por categoria, con su propia direccion.
 *
 * Antes todas vivian en /shop?cat=Taschen. Un parametro no es una pagina:
 * Google lo trata como la misma de siempre y no es un enlace que ella pueda
 * compartir con naturalidad. Ahora cada una es /kollektion/taschen, con su
 * titulo y su descripcion.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const categoria = await buscarCategoria(slug)
  if (!categoria) return { title: "Kollektion · Sabitas" }

  const nombre = categoria.name.replace(/\s*\d{4}$/, "")
  const descripcion = `${nombre} von Sabitas: handgemachte Unikate aus der Schweiz. Jedes Stück nur einmal – wenn es weg ist, ist es weg.`
  return {
    title: `${nombre} · Sabitas`,
    description: descripcion,
    openGraph: {
      title: `${nombre} · Sabitas`,
      description: descripcion,
    },
  }
}

/** Las categorias que existen hoy se generan de antemano. */
export async function generateStaticParams() {
  const categorias = await leerCategorias()
  return categorias.filter((c) => c.slug).map((c) => ({ slug: c.slug }))
}

export default async function CategoriaPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const categoria = await buscarCategoria(slug)
  if (!categoria) notFound()

  return (
    <Suspense>
      <ShopGrid categoriaInicial={categoria.slug} />
    </Suspense>
  )
}
