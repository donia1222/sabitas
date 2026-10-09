"use client"

import { useEffect, useState } from "react"

const POR_DEFECTO: Record<string, string> = {
  ueber_cta_titel: "Bereit für dein Lieblingsstück?",
  ueber_cta_text:
    "Schreib mir auf WhatsApp – ich beantworte gerne deine Fragen, zeige dir mehr Bilder oder fertige etwas nur für dich an.",
  whatsapp_cta: "Auf WhatsApp schreiben",
  whatsapp_number: "41786138084",
}

/**
 * La llamada de contacto que va justo encima del pie.
 *
 * Es la misma que ya tiene en su web: franja con el degradado lila→menta,
 * todo centrado y un solo boton. Los textos salen de los ajustes del sitio,
 * asi que el dia que esten en el panel los cambia ella.
 */
export function CtaContacto({ separada = false }: { separada?: boolean } = {}) {
  const [ajustes, setAjustes] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch("/api/site-settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.success && d.settings) setAjustes(d.settings) })
      .catch(() => {})
  }, [])

  const t = (clave: string) => ajustes[clave] || POR_DEFECTO[clave]
  const numero = (t("whatsapp_number") || "").replace(/[^0-9]/g, "")

  return (
    <section
      className={`container mx-auto px-4 lg:px-8 pb-16 lg:pb-20 ${
        /* En la portada viene detras de un bloque que ya trae su aire; en las
           otras pantallas el contenido termina en seco y hay que separarla. */
        separada ? "pt-14 lg:pt-20" : ""
      }`}
    >
      <div
        className="rounded-[38px] px-7 py-14 lg:px-10 lg:py-16 text-center"
        style={{ background: "linear-gradient(135deg, #ECE2F7, #CDEEDE)" }}
      >
        <h2
          className="font-display font-semibold text-ink leading-tight"
          style={{ fontSize: "clamp(2rem, 4vw, 2.6rem)", letterSpacing: "-0.03em" }}
        >
          {t("ueber_cta_titel")}
        </h2>

        <p className="text-n-600 text-[15.5px] lg:text-[16.5px] max-w-[480px] mx-auto mt-3 leading-relaxed">
          {t("ueber_cta_text")}
        </p>

        <a
          href={`https://wa.me/${numero}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 bg-brand-soft hover:bg-brand text-white font-semibold text-[15px] px-8 py-4 rounded-full shadow-lg shadow-brand/25 transition-colors mt-7"
        >
          <svg viewBox="0 0 32 32" className="w-[18px] h-[18px]" fill="currentColor" aria-hidden>
            <path d="M16 3C9 3 3.5 8.5 3.5 15.5c0 2.4.7 4.6 1.8 6.5L3 29l7.2-2.2c1.8 1 3.9 1.6 6 1.6 7 0 12.5-5.5 12.5-12.5S23 3 16 3zm0 22.7c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-4.3 1.3 1.3-4.1-.3-.4c-1.1-1.7-1.6-3.6-1.6-5.6C5.1 9.8 10 5 16 5s10.9 4.8 10.9 10.5S22 25.7 16 25.7z" />
          </svg>
          {t("whatsapp_cta")}
        </a>
      </div>
    </section>
  )
}
