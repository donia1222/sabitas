"use client"

import { Gift, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

const AMOUNTS = [20, 50, 100]

export function GutscheinBanner() {
  const router = useRouter()

  const goToAmount = (amount: number) =>
    router.push(`/gutscheine?betrag=${amount}`)
  const goToCustom = () => router.push(`/gutscheine?custom=1`)

  return (
    <section className="py-6 bg-white">
      <div className="container mx-auto px-4">

        {/* Tarjeta con borde — mismo estilo que RandomImageSection */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-n-150 shadow-sm p-5 sm:p-7">

          {/* Círculos decorativos verdes flotantes */}
          <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-brand/5 animate-float" />
          <div className="pointer-events-none absolute -top-4 -right-4 w-20 h-20 rounded-full bg-brand/8 animate-float-reverse" />

          {/* Header */}
          <div className="relative z-10 mb-8">
            <div className="inline-flex items-center gap-1.5 bg-brand/8 text-brand text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              <Gift className="w-4 h-4" /> Gutscheine
            </div>
            <h2 className="text-2xl font-black text-n-900 tracking-tight">Geschenkgutscheine</h2>
            <p className="text-sm text-n-500 mt-1">
              Verschenken Sie Freude — Betrag wählen und sofort als Gutschein verschicken.
            </p>
          </div>

          {/* Tiles: importes rápidos + importe libre */}
          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => goToAmount(amount)}
                className="group relative overflow-hidden rounded-2xl border border-n-150 aspect-[16/10] text-left active:scale-95 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                <img
                  src="/gutscheinebanner.png"
                  alt={`Gutschein CHF ${amount}`}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 p-3">
                  <span
                    className="text-3xl sm:text-4xl text-white drop-shadow-lg leading-none"
                    style={{ fontFamily: "var(--font-mono), monospace" }}
                  >
                    CHF {amount}.<span className="text-highlight-soft">–</span>
                  </span>
                </div>
              </button>
            ))}

            {/* Importe libre */}
            <button
              onClick={goToCustom}
              className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-brand/30 hover:border-brand aspect-[16/10] bg-brand/5 hover:bg-brand/10 active:scale-95 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                <span className="flex items-center justify-center w-11 h-11 rounded-full bg-brand/12 text-brand mb-2 group-hover:bg-brand group-hover:text-white transition-colors">
                  <Plus className="w-6 h-6" />
                </span>
                <span className="text-xl text-brand leading-tight" style={{ fontFamily: "var(--font-mono), monospace" }}>Individueller Betrag</span>
                <span className="text-[11px] text-n-500 mt-0.5">Betrag selbst wählen</span>
              </div>
            </button>
          </div>

        </div>
      </div>
    </section>
  )
}
