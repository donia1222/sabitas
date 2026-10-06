"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, type LucideIcon } from "lucide-react"

/** Los dos tonos de la maqueta: lila para tienda y blog, azulado para galeria. */
const TONOS = {
  lila: { fondo: "#F4ECFC", rgb: "244,236,252", borde: "#E7DAF7" },
  azul: { fondo: "#E7F1F8", rgb: "231,241,248", borde: "#D6E6F1" },
} as const

interface BannerAtelierProps {
  /** El texto de la pildora de arriba. */
  etiqueta: string
  icono: LucideIcon
  /** Primera linea del titulo, en oscuro. */
  titulo: string
  /** Segunda linea, en lila. Cursiva solo en el banner ancho. */
  titulo2: string
  /** Un parrafo corto. Solo lo lleva el banner ancho. */
  texto?: string
  /** El enlace de abajo: «Entdecken», «Zum Blog»… */
  accion: string
  destino: string
  foto: string
  tono?: keyof typeof TONOS
  /** El ancho manda: el banner que ocupa toda la fila es mas alto y mas grande. */
  ancho?: boolean
}

/**
 * Las tres tarjetas del bloque «Aus dem Atelier».
 *
 * Son el mismo molde a proposito — en la maqueta solo cambian el texto, la foto
 * y el tono — asi que viven en un solo sitio y no se separan con el tiempo.
 * La foto va detras, asomando por la derecha, y un degradado del color de la
 * tarjeta la funde hacia la izquierda para que el texto siempre se lea.
 */
export function BannerAtelier({
  etiqueta, icono: Icono, titulo, titulo2, texto, accion, destino, foto,
  tono = "lila", ancho = false,
}: BannerAtelierProps) {
  const router = useRouter()
  const { fondo, rgb, borde } = TONOS[tono]

  return (
    <button
      onClick={() => router.push(destino)}
      style={{ backgroundColor: fondo, borderColor: borde }}
      className={`group w-full relative overflow-hidden rounded-[22px] border text-left transition-shadow duration-300 hover:shadow-[0_26px_55px_-34px_rgba(107,79,147,0.85)] ${
        ancho ? "h-[220px] md:h-[260px]" : "h-[210px] md:h-[240px]"
      }`}
    >
      <div className={`absolute inset-y-0 right-0 ${ancho ? "w-[62%] md:w-[58%]" : "w-[58%] md:w-[55%]"}`}>
        <img
          src={foto}
          alt=""
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, rgba(${rgb},1) 0%, rgba(${rgb},0.97) 14%, rgba(${rgb},0.5) 46%, rgba(${rgb},0) 82%)`,
          }}
        />
      </div>

      <div className={`relative z-10 h-full flex flex-col justify-center ${ancho ? "px-6 md:px-10" : "px-5 md:px-7"}`}>
        <span
          className="inline-flex items-center gap-1.5 w-fit rounded-full bg-white/70 border border-white px-3 py-1.5 mb-4"
          style={{ color: "#8F46EC" }}
        >
          <Icono className="w-3.5 h-3.5" />
          <span className="text-[10.5px] font-bold uppercase tracking-[0.16em]">{etiqueta}</span>
        </span>

        <h3
          className={`font-display font-semibold text-ink leading-[1.08] ${
            ancho ? "text-[30px] md:text-[42px]" : "text-[22px] md:text-[27px]"
          }`}
          style={{ letterSpacing: "-0.03em" }}
        >
          {ancho ? (
            <>
              {titulo} <span className="italic text-brand-soft">{titulo2}</span>
            </>
          ) : (
            <>
              {titulo}
              <br />
              <span className="text-brand-soft">{titulo2}</span>
            </>
          )}
        </h3>

        {texto && (
          <p className="text-n-600 text-[14px] md:text-[16px] mt-3 max-w-sm leading-relaxed">{texto}</p>
        )}

        <span className="inline-flex items-center gap-2 text-brand font-semibold text-[14px] md:text-[15px] mt-5 group-hover:gap-3 transition-all">
          {accion}
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </button>
  )
}
