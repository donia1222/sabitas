import type { Metadata } from "next"

/**
 * Los metadatos de esta pantalla.
 *
 * Van en un layout y no en la pagina porque la pagina es de cliente
 * («use client») y ahi Next no admite `metadata`. Cada pantalla con su titulo
 * y su descripcion: en Google salian las seis con el texto de la portada.
 */
export const metadata: Metadata = {
  title: "Kontakt · Sabitas",
  description: "Eine Frage zu einem Stück oder ein Wunsch nach etwas Eigenem? Am schnellsten erreichst du mich über WhatsApp.",
  openGraph: {
    title: "Kontakt · Sabitas",
    description: "Eine Frage zu einem Stück oder ein Wunsch nach etwas Eigenem? Am schnellsten erreichst du mich über WhatsApp.",
    url: "/kontakt",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
