import type { Metadata } from "next"

/**
 * Los metadatos de esta pantalla.
 *
 * Van en un layout y no en la pagina porque la pagina es de cliente
 * («use client») y ahi Next no admite `metadata`. Cada pantalla con su titulo
 * y su descripcion: en Google salian las seis con el texto de la portada.
 */
export const metadata: Metadata = {
  title: "Blog · Sabitas",
  description: "Geschichten aus dem Atelier: wie meine Stücke entstehen, welche Stoffe ich gerade mag und was neu dazukommt.",
  openGraph: {
    title: "Blog · Sabitas",
    description: "Geschichten aus dem Atelier: wie meine Stücke entstehen, welche Stoffe ich gerade mag und was neu dazukommt.",
    url: "/blog",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
