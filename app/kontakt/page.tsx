"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { BannerPagina } from "@/components/banner-pagina"
import { MessageCircle, Mail, Clock, Sparkles } from "lucide-react"

/**
 * Kontakt.
 *
 * Todo pasa por WhatsApp, que es como trabaja: el formulario no manda nada a
 * ningun sitio, arma el mensaje y abre la conversacion con el texto escrito.
 * Asi no hay formulario que se pierda ni correo que configurar, y ella
 * contesta desde el telefono como siempre.
 *
 * Direccion y telefono no estan a proposito: hasta que ella los de, mejor
 * vacio que inventado.
 */
const POR_DEFECTO: Record<string, string> = {
  kontakt_titel: "Schreib mir",
  kontakt_titel2: "– ich freue mich",
  kontakt_text:
    "Eine Frage zu einem Stück, ein Wunsch nach etwas Eigenem oder einfach Hallo sagen: am schnellsten erreichst du mich über WhatsApp.",
  whatsapp_number: "41786138084",
  kontakt_email: "hello@sabitas.ch",
}

export default function KontaktPage() {
  const [ajustes, setAjustes] = useState<Record<string, string>>({})
  const [nombre, setNombre] = useState("")
  const [mensaje, setMensaje] = useState("")

  useEffect(() => {
    fetch("/api/site-settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.success && d.settings) setAjustes(d.settings) })
      .catch(() => {})
  }, [])

  const t = (clave: string) => ajustes[clave] || POR_DEFECTO[clave]
  const numero = (t("whatsapp_number") || "").replace(/[^0-9]/g, "")
  const correo = t("kontakt_email")

  const abrirWhatsApp = () => {
    const texto = [
      nombre.trim() ? `Hallo Sabitas, hier ist ${nombre.trim()}.` : "Hallo Sabitas!",
      mensaje.trim(),
    ].filter(Boolean).join("\n\n")
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, "_blank", "noopener")
  }

  const CANALES = [
    {
      icono: MessageCircle,
      titulo: "WhatsApp",
      texto: "Der schnellste Weg zu mir. Auch für Bilder und Sprachnachrichten.",
      accion: "Chat öffnen",
      href: `https://wa.me/${numero}`,
    },
    {
      icono: Mail,
      titulo: "E-Mail",
      texto: correo,
      accion: "E-Mail schreiben",
      href: `mailto:${correo}`,
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Header onCartOpen={() => (window.location.href = "/shop")} />

      <BannerPagina
        miga="Kontakt"
        titulo={t("kontakt_titel")}
        subtitulo={t("kontakt_titel2")}
        texto={t("kontakt_text")}
        foto="/sabitas/telas-e-hilos.jpg"
      />

      <section className="container mx-auto px-4 lg:px-8 py-12 lg:py-16">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-start">

          {/* El formulario: no manda nada, abre WhatsApp con el texto escrito. */}
          <div className="bg-white border border-brand-tint rounded-3xl p-6 sm:p-8 shadow-[0_22px_50px_-38px_rgba(107,79,147,0.9)]">
            <h2 className="font-display font-semibold text-ink text-[22px] leading-tight">
              Nachricht schreiben
            </h2>
            <p className="text-n-500 text-[14px] mt-2 leading-relaxed">
              Füll kurz aus, was du brauchst – der Text landet fertig in WhatsApp,
              du musst ihn nur noch abschicken.
            </p>

            <label className="block mt-6">
              <span className="text-[13.5px] font-semibold text-ink">Dein Name</span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Wie heisst du?"
                /* 16 px: por debajo de eso, Safari hace zoom al tocar el campo. */
                className="mt-2 w-full rounded-2xl border border-brand-tint bg-brand-wash/60 px-4 py-3.5 text-[16px] text-ink placeholder:text-n-400 focus:outline-none focus:border-brand-pale focus:bg-white transition-colors"
              />
            </label>

            <label className="block mt-5">
              <span className="text-[13.5px] font-semibold text-ink">Deine Nachricht</span>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={5}
                placeholder="Worum geht es?"
                className="mt-2 w-full rounded-2xl border border-brand-tint bg-brand-wash/60 px-4 py-3.5 text-[16px] text-ink placeholder:text-n-400 focus:outline-none focus:border-brand-pale focus:bg-white transition-colors resize-none"
              />
            </label>

            <button
              onClick={abrirWhatsApp}
              disabled={!mensaje.trim()}
              className="mt-6 w-full inline-flex items-center justify-center gap-2.5 bg-brand-soft hover:bg-brand disabled:bg-brand-tint disabled:text-brand/50 disabled:cursor-not-allowed text-white font-semibold text-[15px] px-8 py-4 rounded-full shadow-lg shadow-brand/25 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              In WhatsApp öffnen
            </button>
          </div>

          {/* Los canales y lo que puede esperar. */}
          <div className="space-y-4">
            {CANALES.map(({ icono: Icono, titulo, texto, accion, href }) => (
              <a
                key={titulo}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="group flex items-start gap-4 bg-white border border-brand-tint hover:border-brand-pale rounded-2xl p-5 shadow-[0_16px_38px_-34px_rgba(107,79,147,0.9)] transition-colors"
              >
                <span className="w-11 h-11 shrink-0 rounded-full bg-brand-tint text-brand flex items-center justify-center">
                  <Icono className="w-5 h-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink text-[16px]">{titulo}</span>
                  <span className="block text-n-500 text-[14px] mt-1 leading-snug break-words">{texto}</span>
                  <span className="block text-brand font-semibold text-[13.5px] mt-2">{accion} →</span>
                </span>
              </a>
            ))}

            <div className="flex items-start gap-4 bg-brand-wash border border-brand-tint rounded-2xl p-5">
              <span className="w-11 h-11 shrink-0 rounded-full bg-white text-brand flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </span>
              <div>
                <p className="font-semibold text-ink text-[16px]">Antwortzeit</p>
                <p className="text-n-600 text-[14px] mt-1 leading-snug">
                  Meistens am selben Tag. Ich nähe alles selbst – manchmal dauert es
                  bis zum Abend.
                </p>
              </div>
            </div>

            <div
              className="flex items-start gap-4 rounded-2xl p-5"
              style={{ background: "linear-gradient(135deg, #ECE2F7, #CDEEDE)" }}
            >
              <span className="w-11 h-11 shrink-0 rounded-full bg-white/70 text-brand flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <p className="font-semibold text-ink text-[16px]">Etwas ganz Eigenes?</p>
                <p className="text-n-600 text-[14px] mt-1 leading-snug">
                  Stoff, Farbe, Grösse, ein Name darauf – schreib mir, was du dir
                  vorstellst, und ich sage dir, ob es geht.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
