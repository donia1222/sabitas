"use client"

import { useEffect, useRef, useState } from "react"
import { EtiquetaCosida } from "@/components/titulo-cosido"

/**
 * «So entsteht dein Unikat» — los tres pasos.
 *
 * Es el mismo bloque que ya tiene en su web actual, con los mismos tres
 * dibujos (lapiz, aguja y regalo), y por la misma razon: quien ve fotos y un
 * precio no sabe si esto es artesania o reventa. Tres pasos lo cuentan sin
 * tener que jurarlo.
 *
 * El texto no sale del panel a proposito: es como trabaja ella, no cambia
 * cada semana.
 */
const PASOS = [
  {
    titulo: "Die Idee",
    texto: "Ein Stoff, eine Farbe, ein Muster – meistens fängt es mit etwas an, das mir in die Hände fällt.",
    trazos: [
      "M4 20.5 5.2 16l9.3-9.3a2 2 0 0 1 2.8 0l0 0a2 2 0 0 1 0 2.8L8 18.8Z",
      "M13.5 7.5 16.5 10.5",
      "M14.5 20.5h5.5",
    ],
  },
  {
    titulo: "Handarbeit",
    texto: "Geschnitten, genäht und gestaltet bei mir zu Hause. Kein Stück ist wie das andere – auch wenn ich es wollte.",
    trazos: [
      "M20 4 8.5 15.5",
      "M19.2 3.2a2 2 0 0 1 1.6 1.6l-1.4 1.4-1.6-1.6Z",
      "M8.5 15.5 7 19l3.5-1.5Z",
      "M4 20c2.5-1.5 2.5-4.5 0-6",
      "M4 14c2.5-1.5 2.5-4.5 0-6",
    ],
  },
  {
    titulo: "Dein Unikat",
    texto: "Sorgfältig verpackt und unterwegs zu dir. Mit einem kleinen Gruss, weil es eben kein Massenprodukt ist.",
    trazos: [
      "M3.5 9.5h17v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z",
      "M3.5 13.5h17",
      "M12 9.5v13",
      "M12 9.5c-3.5 0-5-1-5-2.8S8.5 3.5 12 9.5Z",
      "M12 9.5c3.5 0 5-1 5-2.8s-1.5-3.2-5 2.8Z",
    ],
  },
]

/** La costura: la linea de puntos que separa los bloques en su web. */
function Costura() {
  return (
    <div className="container mx-auto px-4 lg:px-8">
      <span className="block h-0 border-t-2 border-dashed border-brand-pale/55 rounded-sm" />
    </div>
  )
}

export function ProcesoSection() {
  const ref = useRef<HTMLElement>(null)
  /**
   * Cada vez que el bloque entra en pantalla sumamos uno. Ese numero es la
   * `key` de los pasos: React los vuelve a montar y la animacion arranca de
   * cero. Reiniciar una animacion ya empezada no se puede hacer solo con CSS
   * — hay que volver a crear el elemento o forzar un reflow.
   */
  const [ciclo, setCiclo] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Si el sistema pide menos movimiento, se ve quieto y ya.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setCiclo(1)
      return
    }
    const observador = new IntersectionObserver(
      ([entrada]) => { if (entrada.isIntersecting) setCiclo((c) => c + 1) },
      { threshold: 0.3 },
    )
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  return (
    <>
      <Costura />

      <section ref={ref} className="bg-canvas">
        <div className="container mx-auto px-4 lg:px-8 py-14 lg:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <EtiquetaCosida className="flex justify-center">Handarbeit</EtiquetaCosida>
            <h2
              className="font-display font-semibold text-ink mt-4 leading-tight"
              style={{ fontSize: "clamp(2rem, 4.2vw, 2.9rem)", letterSpacing: "-0.03em" }}
            >
              So entsteht dein Unikat
            </h2>
            <p className="text-n-600 text-[15.5px] lg:text-[16.5px] mt-4 leading-relaxed">
              Von der ersten Idee bis zu dem Stück, das bei dir ankommt – alles in der Schweiz,
              alles von Hand.
            </p>
          </div>

          <div key={ciclo} className="grid grid-cols-1 md:grid-cols-3 gap-9 md:gap-7 mt-12">
            {PASOS.map((paso, i) => (
              <div
                key={paso.titulo}
                className={`text-center ${ciclo > 0 ? "paso-entra" : "opacity-0"}`}
                style={{ animationDelay: `${i * 140}ms` }}
              >
                <div className="relative w-[76px] h-[76px] mx-auto mb-4">
                  <span className="absolute inset-0 rounded-full bg-white border-2 border-dashed border-brand-pale shadow-[0_10px_24px_-14px_rgba(120,90,160,0.55)] flex items-center justify-center text-brand-dark">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-[34px] h-[34px]"
                      aria-hidden
                    >
                      {paso.trazos.map((d, t) => (
                        <path
                          key={t}
                          d={d}
                          pathLength={1}
                          className={ciclo > 0 ? "trazo" : undefined}
                          style={{ animationDelay: `${i * 140 + 160 + t * 110}ms` }}
                        />
                      ))}
                    </svg>
                  </span>
                  <span
                    className={`absolute -top-1.5 left-1/2 ml-[22px] w-[26px] h-[26px] rounded-full bg-brand-dark text-white text-[12px] font-bold flex items-center justify-center ${
                      ciclo > 0 ? "num-entra" : "opacity-0"
                    }`}
                    style={{ animationDelay: `${i * 140 + 420}ms` }}
                  >
                    {i + 1}
                  </span>
                </div>

                <h3 className="font-semibold text-brand-dark text-[17px]">{paso.titulo}</h3>
                <p className="text-n-600 text-[14.5px] mt-1.5 leading-relaxed max-w-[280px] mx-auto">
                  {paso.texto}
                </p>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes pasoEntra { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
          @keyframes numEntra  { from { opacity: 0; transform: scale(0.4) } 60% { transform: scale(1.12) } to { opacity: 1; transform: scale(1) } }
          @keyframes trazoDibuja { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }

          .paso-entra { animation: pasoEntra .55s cubic-bezier(.22,.8,.3,1) both }
          .num-entra  { animation: numEntra .45s cubic-bezier(.3,1.4,.5,1) both }
          .trazo      { stroke-dasharray: 1; stroke-dashoffset: 1; animation: trazoDibuja .7s ease forwards }

          @media (prefers-reduced-motion: reduce) {
            .paso-entra, .num-entra, .trazo { animation: none !important; opacity: 1; stroke-dashoffset: 0 }
          }
        `}</style>
      </section>

      <Costura />
    </>
  )
}
