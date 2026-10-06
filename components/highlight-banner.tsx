"use client"

import { Sparkles } from "lucide-react"
import { BannerAtelier } from "./banner-atelier"

/** El banner ancho de la portada. Lleva a /neuheiten. */
export function HighlightBanner() {
  return (
    <BannerAtelier
      ancho
      etiqueta="Neue Edition"
      icono={Sparkles}
      titulo="Neue"
      titulo2="Editionen"
      texto="Frisch aufgelegte Serien, solange die Auflage reicht."
      accion="Entdecken"
      destino="/neuheiten"
      foto="/sabitas/banner-ediciones.jpg"
    />
  )
}
