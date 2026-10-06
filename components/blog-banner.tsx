"use client"

import { Newspaper } from "lucide-react"
import { BannerAtelier } from "./banner-atelier"

export function BlogBanner() {
  return (
    <BannerAtelier
      etiqueta="Blog"
      icono={Newspaper}
      titulo="Tipps & Neuigkeiten"
      titulo2="aus dem Shop"
      accion="Zum Blog"
      destino="/blog"
      foto="/sabitas/banner-blog.jpg"
    />
  )
}
