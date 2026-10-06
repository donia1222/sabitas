"use client"

import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"

interface BannerPaginaProps {
  /** El ultimo escalon de las migas. El primero siempre es «Start». */
  miga: string
  /** Primera linea del titulo, en oscuro. */
  titulo: string
  /** Segunda linea, en cursiva lila. Puede faltar. */
  subtitulo?: string
  /** Un parrafo corto. Dos o tres lineas como mucho. */
  texto?: string
  /** La foto de la derecha. */
  foto: string
}

/**
 * La banda que abre Kollektion, Galerie y Blog.
 *
 * Es la misma en las tres a proposito: en las maquetas lo unico que cambia es
 * el texto y la foto, y tener un solo componente evita que se separen con el
 * tiempo, que es justo lo que le habia pasado a las cabeceras.
 */
export function BannerPagina({ miga, titulo, subtitulo, texto, foto }: BannerPaginaProps) {
  const router = useRouter()

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-tint via-brand-wash to-white border-b border-brand-tint">
      {/* La foto vive detras y solo asoma por la derecha; el degradado de
          encima la funde con el fondo para que no se corte en seco. */}
      <div className="absolute inset-y-0 right-0 w-full lg:w-[52%] hidden sm:block">
        <img src={foto} alt="" className="w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(251,247,251,1) 0%, rgba(251,247,251,0.92) 28%, rgba(251,247,251,0.25) 70%, rgba(251,247,251,0) 100%)",
          }}
        />
      </div>

      <div className="relative container mx-auto px-4 lg:px-8">
        <div className="max-w-xl py-10 lg:py-14">
          <nav className="flex items-center gap-1 text-[13px] text-n-500 mb-4">
            <button onClick={() => router.push("/")} className="hover:text-brand transition-colors">
              Start
            </button>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            <span className="text-brand font-medium">{miga}</span>
          </nav>

          <h1
            className="font-display font-semibold text-ink leading-[1.1]"
            style={{ fontSize: "clamp(1.9rem, 4.4vw, 3rem)", letterSpacing: "-0.03em" }}
          >
            {titulo}
            {subtitulo && (
              <>
                <br />
                <span className="italic text-brand">{subtitulo}</span>
              </>
            )}
          </h1>

          {texto && (
            <p className="text-n-600 text-[15.5px] lg:text-[16.5px] mt-5 leading-relaxed">
              {texto}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
