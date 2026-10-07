import type { Metadata } from "next"

/**
 * Los metadatos de esta pantalla.
 *
 * Van en un layout y no en la pagina porque la pagina es de cliente
 * («use client») y ahi Next no admite `metadata`. Cada pantalla con su titulo
 * y su descripcion: en Google salian las seis con el texto de la portada.
 */
export const metadata: Metadata = {
  title: "Galerie · Sabitas",
  description: "Bilder meiner Arbeiten: fertige Stücke, Stoffe und Einblicke in die Werkstatt.",
  openGraph: {
    title: "Galerie · Sabitas",
    description: "Bilder meiner Arbeiten: fertige Stücke, Stoffe und Einblicke in die Werkstatt.",
    url: "/gallery",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
