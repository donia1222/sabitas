"use client"

import { EtiquetaCosida } from "@/components/titulo-cosido"

/**
 * Las primeras reseñas: gente que ya le ha comprado de verdad.
 *
 * No son de Google —ahi todavia no tiene ninguna—, asi que el bloque no dice
 * que lo sean. El dia que lleguen las de Google, se cambian por aquellas.
 */
const RESENAS = [
  {
    nombre: "Andrea Salvador",
    cuando: "Vor 2 Wochen",
    texto:
      "Ich habe eine Deko für meine Mutter gekauft und sie war sofort verliebt. Man sieht und spürt, dass alles von Hand gemacht ist – so etwas findet man im Laden einfach nicht.",
  },
  {
    nombre: "Marina",
    cuando: "Vor 1 Monat",
    texto:
      "Meine Tasche aus Jeansstoff begleitet mich seit Wochen überall hin. Schöne Stoffe, saubere Nähte und jedes Mal werde ich darauf angesprochen. Es kommt bestimmt noch etwas dazu.",
  },
  {
    nombre: "Roberto",
    cuando: "Vor 1 Monat",
    texto:
      "Ich habe eine Hundeleine gekauft und bin begeistert. Sehr sorgfältig gearbeitet, robust und richtig hübsch – genau so, wie ich es mir vorgestellt hatte.",
  },
]

/** Las iniciales, para el circulo del avatar. */
function iniciales(nombre: string) {
  return nombre.split(" ").map(p => p[0]).slice(0, 2).join("")
}

/** Las cinco estrellas, dibujadas pero vacias: aun no hay nota que enseñar. */
function EstrellasVacias() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className="w-3.5 h-3.5 text-brand-pale"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
    </div>
  )
}

/** Las cinco estrellas, llenas. */
function Estrellas() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 text-highlight fill-current" viewBox="0 0 20 20" aria-hidden>
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
    </div>
  )
}

export function ReviewsSection() {
  return (
    <section className="bg-canvas border-t border-brand-tint">
      <div className="container mx-auto px-4 lg:px-8 py-14 lg:py-16">

        <div className="max-w-2xl">
          <EtiquetaCosida>Bewertungen</EtiquetaCosida>
          <h2
            className="font-display font-semibold text-ink mt-4 leading-tight"
            style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.3rem)", letterSpacing: "-0.03em" }}
          >
            Was meine Kundinnen sagen
          </h2>
          <p className="text-n-600 text-[15px] mt-3 leading-relaxed">
            Ein paar Stimmen von Menschen, die schon etwas von mir zu Hause haben.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {RESENAS.map(({ nombre, cuando, texto }) => (
            <div
              key={nombre}
              className="bg-white border border-brand-tint rounded-2xl p-5 shadow-[0_16px_38px_-34px_rgba(107,79,147,0.9)] flex flex-col"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 shrink-0 rounded-full bg-brand-tint text-brand font-semibold text-[14px] flex items-center justify-center">
                  {iniciales(nombre)}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-ink text-[15px] leading-tight truncate">{nombre}</p>
                  <p className="text-n-400 text-[12.5px] mt-0.5">{cuando}</p>
                </div>
              </div>

              <div className="mt-4">
                <Estrellas />
              </div>

              <p className="text-n-600 text-[14.5px] mt-3 leading-relaxed">{texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
