"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Heart, Gem, Leaf, Flower2, MessageCircle } from "lucide-react"

/**
 * Über mich.
 *
 * Los textos salen de los ajustes del sitio (`site_content`) con estos valores
 * por defecto, asi que el dia que se añadan los campos al panel ella los podra
 * cambiar sin tocar nada aqui.
 */
const POR_DEFECTO: Record<string, string> = {
  ueber_eyebrow: "Über mich",
  ueber_titel: "Hallo, ich bin Sabitas 👋",
  ueber_text:
    "Mit Nadel, Faden und einer grossen Portion Fantasie verwandle ich Stoffe und Ideen in kleine Kunstwerke. Was als Hobby begann, ist heute meine grösste Leidenschaft.\n\n" +
    "Jede Tasche, jeder Hoodie und jede Figur entsteht bei mir zu Hause in der Schweiz – in Handarbeit, mit Liebe zum Detail und dem Wunsch, dir ein Lächeln zu schenken.\n\n" +
    "Du hast einen besonderen Wunsch? Schreib mir – ich fertige auch gerne ganz nach deinen Vorstellungen.",
  ueber_signatur: "~ alles handgemacht, alles mit Herz ♡",
  ueber_cta_titel: "Bereit für dein Lieblingsstück?",
  ueber_cta_text:
    "Schreib mir auf WhatsApp – ich beantworte gerne deine Fragen, zeige dir mehr Bilder oder fertige etwas ganz für dich an.",
  whatsapp_number: "41786138084",
}

const VALORES = [
  { icono: Heart, titulo: "Handarbeit", texto: "Jedes Stück entsteht bei mir mit viel Liebe und Sorgfalt." },
  { icono: Gem, titulo: "Einzigartige Stücke", texto: "Kein Stück gleicht dem anderen. Du bekommst ein echtes Unikat." },
  { icono: Leaf, titulo: "Hochwertige Materialien", texto: "Ich verwende sorgfältig ausgewählte Stoffe." },
  { icono: Flower2, titulo: "Aus der Schweiz", texto: "Von mir entworfen und gefertigt – in der Schweiz." },
]

export default function UeberMichPage() {
  const [ajustes, setAjustes] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((d) => { if (d.success && d.settings) setAjustes(d.settings) })
      .catch(() => {})
  }, [])

  const t = (clave: string) => ajustes[clave] || POR_DEFECTO[clave]
  const numero = (t("whatsapp_number") || "").replace(/[^0-9]/g, "")

  return (
    <div className="min-h-screen bg-white">
      <Header onCartOpen={() => (window.location.href = "/shop")} />

      {/* ── Quién soy ─────────────────────────────────────────────────────
          Tres zonas: el retrato a la izquierda, el texto en medio y la foto
          del taller asomando por la derecha, fundida con el fondo lila. */}
      <section id="ueber" className="relative overflow-hidden bg-gradient-to-br from-brand-tint via-brand-wash to-white">
        <div className="absolute inset-y-0 right-0 w-[42%] hidden lg:block">
          <img src="/sabitas/taller-flores.jpg" alt="" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, rgba(251,247,251,1) 0%, rgba(251,247,251,0.75) 35%, rgba(251,247,251,0.15) 80%, rgba(251,247,251,0) 100%)",
            }}
          />
        </div>

        <div className="relative container mx-auto px-4 lg:px-8 py-12 lg:py-16">
          <div className="grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-10 lg:gap-14 items-center max-w-5xl">
            <img
              src="/sabitas/retrato.jpg"
              alt="Sabitas"
              className="w-[260px] sm:w-[320px] lg:w-full mx-auto lg:mx-0 rounded-3xl"
            />

            <div>
              <p className="text-brand text-[12px] font-semibold uppercase tracking-[0.22em]">
                {t("ueber_eyebrow")}
              </p>

              <h1
                className="font-display font-semibold text-ink mt-3 leading-tight"
                style={{ fontSize: "clamp(1.8rem, 3.8vw, 2.6rem)", letterSpacing: "-0.03em" }}
              >
                {t("ueber_titel")}
              </h1>

              <span className="block w-32 h-[3px] rounded-full bg-brand-pale mt-4 mb-6" />

              <div className="space-y-4 text-n-600 text-[15.5px] lg:text-[16.5px] leading-relaxed max-w-xl">
                {t("ueber_text").split("\n\n").map((parrafo, i) => (
                  <p key={i}>{parrafo}</p>
                ))}
              </div>

              {/* La firma: la unica cursiva de la pagina, por eso destaca. */}
              <p className="italic text-brand text-[19px] lg:text-[21px] mt-7">
                {t("ueber_signatur")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Las cuatro razones ── */}
      <section className="bg-white">
        <div className="container mx-auto px-4 lg:px-8 -mt-6 lg:-mt-10 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {VALORES.map(({ icono: Icono, titulo, texto }) => (
              <div
                key={titulo}
                className="bg-white border border-brand-tint rounded-2xl px-5 py-7 text-center shadow-[0_18px_40px_-30px_rgba(107,79,147,0.9)]"
              >
                <span className="w-12 h-12 mx-auto rounded-full bg-brand-tint text-brand flex items-center justify-center">
                  <Icono className="w-5 h-5" />
                </span>
                <p className="font-semibold text-ink text-[16px] mt-4">{titulo}</p>
                <p className="text-n-500 text-[14px] mt-1.5 leading-snug">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Escríbeme ── */}
      <section className="container mx-auto px-4 lg:px-8 py-14 lg:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-tint via-brand-wash to-[#e6f4ec] px-7 py-10 lg:px-14 lg:py-14">
          <div className="relative z-10 grid lg:grid-cols-[1.2fr_auto] gap-8 items-center">
            <div>
              <h2
                className="font-display font-semibold text-ink leading-tight"
                style={{ fontSize: "clamp(1.6rem, 3.4vw, 2.4rem)", letterSpacing: "-0.03em" }}
              >
                {t("ueber_cta_titel")}
              </h2>
              <p className="text-n-600 text-[15.5px] mt-3 max-w-lg leading-relaxed">
                {t("ueber_cta_text")}
              </p>
            </div>

            <a
              href={`https://wa.me/${numero}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 bg-brand-soft hover:bg-brand text-white font-semibold text-[15px] px-8 py-4 rounded-full shadow-lg shadow-brand/25 transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-5 h-5" />
              Auf WhatsApp schreiben
            </a>
          </div>

          {/* El corazon dibujado de la maqueta, a la derecha. */}
          <svg
            className="absolute right-4 bottom-2 w-48 h-28 text-brand-pale hidden lg:block pointer-events-none"
            viewBox="0 0 200 110"
            fill="none"
            aria-hidden
          >
            <path
              d="M8 100 C 60 100 92 72 112 50"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M112 50 c -10 -16 -30 -6 -24 10 c 5 12 24 22 24 22 s 19 -10 24 -22 c 6 -16 -14 -26 -24 -10 Z"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M150 34 h12" /><path d="M146 22 l9 -8" /><path d="M158 46 l12 4" />
            </g>
          </svg>
        </div>
      </section>

      <Footer />
    </div>
  )
}
