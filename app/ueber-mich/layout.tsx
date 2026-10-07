import type { Metadata } from "next"

/**
 * Los metadatos de esta pantalla.
 *
 * Van en un layout y no en la pagina porque la pagina es de cliente
 * («use client») y ahi Next no admite `metadata`. Cada pantalla con su titulo
 * y su descripcion: en Google salian las seis con el texto de la portada.
 */
export const metadata: Metadata = {
  title: "Über mich · Sabitas",
  description: "Hinter Sabitas steht Sabrina: Nadel, Faden und eine grosse Portion Fantasie. Alles von Hand gefertigt in der Schweiz.",
  openGraph: {
    title: "Über mich · Sabitas",
    description: "Hinter Sabitas steht Sabrina: Nadel, Faden und eine grosse Portion Fantasie. Alles von Hand gefertigt in der Schweiz.",
    url: "/ueber-mich",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
