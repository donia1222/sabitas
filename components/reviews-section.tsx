"use client"

import { EtiquetaCosida } from "@/components/titulo-cosido"

const GoogleLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={`${className} flex-shrink-0`} viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

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

/**
 * Las reseñas de Google.
 *
 * Todavia no hay ninguna suya, asi que se ve el molde: tres tarjetas apagadas
 * con la forma exacta que tendran cuando lleguen. No hay nota ni numero de
 * reseñas inventados — las que venian con la plantilla eran de una tienda de
 * pesca, con nombres y fechas de otra gente.
 */
export function ReviewsSection() {
  return (
    <section className="bg-canvas border-t border-brand-tint">
      <div className="container mx-auto px-4 lg:px-8 py-14 lg:py-16">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
          <div>
            <EtiquetaCosida>Bewertungen</EtiquetaCosida>
            <h2
              className="font-display font-semibold text-ink mt-4 leading-tight"
              style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.3rem)", letterSpacing: "-0.03em" }}
            >
              Was meine Kundinnen sagen
            </h2>
            <p className="text-n-600 text-[15px] mt-3 max-w-md leading-relaxed">
              Hier erscheinen die Bewertungen von Google, sobald die ersten da sind.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white border border-brand-tint rounded-2xl px-5 py-4 self-start shadow-[0_14px_34px_-28px_rgba(107,79,147,0.9)]">
            <GoogleLogo className="w-7 h-7" />
            <div>
              <p className="font-semibold text-ink text-[14.5px] leading-tight">Google Bewertungen</p>
              <p className="text-n-500 text-[12.5px] mt-0.5">Noch keine Bewertungen</p>
            </div>
          </div>
        </div>

        {/* El molde: tres tarjetas con la forma que tendran las de verdad. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white border border-brand-tint rounded-2xl p-5 shadow-[0_16px_38px_-34px_rgba(107,79,147,0.9)]"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-brand-tint shrink-0" />
                <div className="flex-1 space-y-2">
                  <span className="block h-2.5 w-28 rounded-full bg-brand-tint" />
                  <span className="block h-2 w-16 rounded-full bg-brand-tint/70" />
                </div>
                <GoogleLogo className="w-4 h-4 opacity-40" />
              </div>

              <div className="mt-4">
                <EstrellasVacias />
              </div>

              <div className="mt-4 space-y-2.5">
                <span className="block h-2 w-full rounded-full bg-brand-tint/70" />
                <span className="block h-2 w-[92%] rounded-full bg-brand-tint/70" />
                <span className="block h-2 w-[70%] rounded-full bg-brand-tint/70" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
