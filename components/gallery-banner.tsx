"use client"

import { Images } from "lucide-react"
import { BannerAtelier } from "./banner-atelier"

export function GalleryBanner() {
  return (
    <BannerAtelier
      tono="azul"
      etiqueta="Galerie"
      icono={Images}
      titulo="Eindrücke aus dem"
      titulo2="Shop & Outdoor"
      accion="Zur Galerie"
      destino="/gallery"
      foto="/sabitas/banner-galeria.jpg"
    />
  )
}
