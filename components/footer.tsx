"use client"

import { useState, useEffect, useMemo } from "react"
import { CONTACTO, LOCALIDAD_COMPLETA, CONSULTA_MAPA, descargarVCard } from "@/lib/contacto"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AdminLoginButton } from "@/components/admin-auth"
import { InstallPWAButton } from "@/components/install-pwa-button"
import { Facebook, Twitter, Instagram, Newspaper, ArrowRight, Download, ShieldCheck, MapPin, Phone, Mail } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export function Footer() {
  const router = useRouter()
  const [openModal, setOpenModal] = useState<string | null>(null)
  const [siteContent, setSiteContent] = useState<Record<string, string>>({})
  const [isStandalone, setIsStandalone] = useState(false)

  // Detectar si ya está abierta como app instalada (PWA standalone)
  useEffect(() => {
    const check = () =>
      setIsStandalone(
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
      )
    check()
    const mq = window.matchMedia("(display-mode: standalone)")
    mq.addEventListener?.("change", check)
    return () => mq.removeEventListener?.("change", check)
  }, [])

  useEffect(() => {
    fetch(`/api/site-settings`)
      .then(r => r.json())
      .then(data => { if (data.success && data.settings) setSiteContent(data.settings) })
      .catch(() => {})
  }, [])
  const [paySettings, setPaySettings] = useState<{
    enable_paypal: boolean
    enable_stripe: boolean
    enable_twint: boolean
    enable_invoice: boolean
  } | null>(null)

  useEffect(() => {
    fetch(`/api/payment-settings`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.settings) {
          const s = data.settings
          setPaySettings({
            enable_paypal: !!s.enable_paypal,
            enable_stripe: !!s.enable_stripe,
            enable_twint: !!s.enable_twint,
            enable_invoice: s.enable_invoice !== false,
          })
        }
      })
      .catch(() => {})
  }, [])

  const handleDownloadVCard = () => { void descargarVCard() }

  const legalDefaults = {
    datenschutz: {
      title: "Datenschutzerklärung",
      content: `Sabitas · Sabrina Steinbeck | Waldeggstrasse 10, 9631 Ulisbach | hello@sabitas.ch

Diese Datenschutzerklärung informiert Sie gemäss dem Schweizer Datenschutzgesetz (DSG) sowie der EU-Datenschutz-Grundverordnung (DSGVO) über die Verarbeitung Ihrer personenbezogenen Daten.

1. VERANTWORTLICHE STELLE
Sabitas
Waldeggstrasse 10, 9631 Ulisbach, Schweiz
Telefon: +41 78 613 80 84
E-Mail: hello@sabitas.ch

2. WELCHE DATEN WIR ERHEBEN
Im Rahmen der Bestellabwicklung erheben wir folgende Daten: Vor- und Nachname, Lieferadresse, E-Mail-Adresse, Telefonnummer sowie Zahlungsinformationen. Beim Besuch unserer Website werden technische Daten wie IP-Adresse, Browsertyp, Besuchsdauer und aufgerufene Seiten automatisch erfasst.

3. ZWECK DER DATENVERARBEITUNG
Wir verwenden Ihre Daten ausschliesslich für folgende Zwecke: Abwicklung und Bestätigung Ihrer Bestellungen, Versand und Lieferung der gekauften Produkte, Kundenkommunikation und Support, Erfüllung gesetzlicher Pflichten sowie zur Verbesserung unseres Angebots.

4. RECHTSGRUNDLAGE
Die Verarbeitung Ihrer Daten erfolgt zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO), zur Erfüllung rechtlicher Verpflichtungen (Art. 6 Abs. 1 lit. c DSGVO) sowie auf Basis unseres berechtigten Interesses an einem sicheren und effizienten Shopbetrieb (Art. 6 Abs. 1 lit. f DSGVO).

5. WEITERGABE VON DATEN
Ihre Daten werden nur an Dritte weitergegeben, soweit dies für die Vertragsabwicklung notwendig ist (z. B. Paketdienstleister für die Lieferung, Zahlungsanbieter wie PayPal oder PostFinance). Eine Weitergabe zu Werbezwecken an Dritte findet nicht statt.

6. DATENSICHERHEIT
Wir setzen technische und organisatorische Sicherheitsmassnahmen ein, um Ihre Daten vor Verlust, Manipulation und unberechtigtem Zugriff zu schützen. Unser Online-Shop ist durch SSL/TLS-Verschlüsselung gesichert.

7. SPEICHERDAUER
Ihre Daten werden nur so lange gespeichert, wie es für den jeweiligen Zweck notwendig ist oder gesetzliche Aufbewahrungsfristen (in der Regel 10 Jahre für Buchhaltungsunterlagen) es erfordern.

8. IHRE RECHTE
Sie haben jederzeit das Recht auf: Auskunft über Ihre gespeicherten Daten, Berichtigung unrichtiger Daten, Löschung Ihrer Daten (sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen), Einschränkung der Verarbeitung sowie Datenübertragbarkeit. Zur Ausübung Ihrer Rechte wenden Sie sich an: hello@sabitas.ch

9. COOKIES
Unsere Website verwendet technisch notwendige Cookies, die für den Betrieb des Shops erforderlich sind. Analytische oder Marketing-Cookies werden nur mit Ihrer ausdrücklichen Einwilligung gesetzt.

10. ÄNDERUNGEN
Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Stand: Februar 2026.`,
    },
    zahlungsarten: {
      title: "Zahlungsarten",
      content: `Sabitas akzeptiert folgende Zahlungsmittel:

Per Telefon
Käufer und Verkäufer tauschen ihre Telefonnummern aus und vereinbaren die Zahlung direkt miteinander. So können Sie den Betrag bequem über eine Bezahl-App wie TWINT oder eine ähnliche Anwendung begleichen.

PostFinance
Bezahlen Sie bequem über Ihr PostFinance-Konto (E-Finance oder PostFinance Card). Ideal für alle PostFinance-Kunden in der Schweiz.

VISA / Mastercard / American Express
Wir akzeptieren alle gängigen Kredit- und Debitkarten. Die Zahlung erfolgt verschlüsselt über eine sichere SSL-Verbindung. Ihr Kartendaten werden nicht gespeichert.

PayPal
Bezahlen Sie über Ihr bestehendes PayPal-Konto. PayPal bietet einen integrierten Käuferschutz und ist weltweit verbreitet.

Allgemeine Hinweise
— Alle Preise verstehen sich in Schweizer Franken (CHF) inkl. MwSt.
— Der Kaufbetrag wird erst nach Versandbestätigung belastet.
— Bei Fragen zur Zahlung erreichen Sie uns unter hello@sabitas.ch oder +41 78 613 80 84.`,
    },
    impressum: {
      title: "Impressum",
      content: `Angaben gemäss Schweizer Recht (OR Art. 944)

BETREIBER DES ONLINE-SHOPS
Sabitas
Waldeggstrasse 10
9631 Ulisbach
Kanton St. Gallen, Schweiz

INHABERIN
Sabrina Steinbeck

KONTAKT
Telefon: +41 78 613 80 84
E-Mail: hello@sabitas.ch
Website: www.sabitas.ch

UNTERNEHMENSFORM
Einzelunternehmen / Kleinunternehmen nach Schweizer Recht

MEHRWERTSTEUER
Alle Preise verstehen sich in CHF inklusive der gesetzlichen Schweizer Mehrwertsteuer (MwSt.).

VERANTWORTLICH FÜR DEN INHALT
Sabrina Steinbeck, Waldeggstrasse 10, 9631 Ulisbach

WEBDESIGN & UMSETZUNG
lweb.ch – Webdesign & Digitalagentur
Website: https://lweb.ch

HAFTUNGSAUSSCHLUSS
Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschliesslich deren Betreiber verantwortlich. Alle Inhalte dieser Website sind urheberrechtlich geschützt.

ANWENDBARES RECHT
Es gilt ausschliesslich Schweizer Recht. Gerichtsstand ist Wattwil, Kanton St. Gallen.

Stand: Februar 2026`,
    },
    rueckgabe: {
      title: "Versand & Rückgabe",
      content: `Sabitas · Sabrina Steinbeck | Waldeggstrasse 10, 9631 Ulisbach | hello@sabitas.ch

1. VERSAND
Wir liefern ausschliesslich innerhalb der Schweiz. Bestellungen werden in der Regel innerhalb von 1–3 Werktagen nach Zahlungseingang versandt. Der Versand erfolgt mit einem zuverlässigen Schweizer Paketdienstleister. Sie erhalten nach dem Versand eine E-Mail mit Ihrer Sendungsverfolgungsnummer. Versandkosten werden transparent im Bestellprozess ausgewiesen.

2. RÜCKGABERECHT
Sie können bestellte Artikel innerhalb von 14 Tagen ab Erhalt ohne Angabe von Gründen zurückgeben. Bitte kontaktieren Sie uns vor der Rücksendung per E-Mail an hello@sabitas.ch oder telefonisch unter +41 78 613 80 84.

3. ZUSTAND DER WARE
Die Ware muss sich in originalem, unbenutztem Zustand befinden und in der Originalverpackung zurückgesendet werden. Bei Produkten wie Messern, Armbrüsten oder Outdoor-Ausrüstung dürfen keine Gebrauchsspuren vorhanden sein.

4. AUSNAHMEN VOM RÜCKGABERECHT
Vom Rückgaberecht ausgenommen sind: auf Kundenwunsch angefertigte oder gravierte Artikel, entsiegelte Hygieneartikel sowie Munition und gesetzlich regulierte Waren, sofern das Siegel gebrochen wurde.

5. RÜCKSENDEPROZESS
Bitte senden Sie die Ware gut verpackt an folgende Adresse zurück:
Sabitas
Waldeggstrasse 10
9631 Ulisbach

Die Rücksendekosten trägt der Käufer. Wir empfehlen, die Sendung versichert zu verschicken.

6. ERSTATTUNG
Nach Erhalt und Prüfung der zurückgesandten Ware erstatten wir den Kaufpreis innerhalb von 14 Tagen auf dem ursprünglichen Zahlungsweg. Bei PayPal, PostFinance sowie Kredit- und Debitkarten erfolgt die Gutschrift direkt auf das verwendete Konto; bei Zahlung per Telefon erfolgt die Rückerstattung nach Absprache mit Ihnen.

7. BESCHÄDIGTE ODER FALSCHE LIEFERUNG
Falls Sie eine beschädigte oder falsche Ware erhalten haben, wenden Sie sich bitte umgehend an uns. Wir übernehmen in diesem Fall die Rücksendekosten und liefern Ihnen die korrekte Ware auf dem schnellsten Weg zu.`,
    },
  }

  const legalContent = useMemo(() => {
    const out = JSON.parse(JSON.stringify(legalDefaults)) as typeof legalDefaults
    for (const k of Object.keys(out) as (keyof typeof out)[]) {
      const t = siteContent[`footer_${k}_title`]
      const c = siteContent[`footer_${k}_content`]
      if (t) out[k].title = t
      if (c) out[k].content = c
    }
    return out
  }, [siteContent])

  return (
    <footer id="footer" className="bg-white mt-0">

      {/* ── Payment icons strip ── */}
      {paySettings && (paySettings.enable_invoice || paySettings.enable_stripe || paySettings.enable_twint || paySettings.enable_paypal) && (
        <div className="border-t border-b border-n-200 py-3.5 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {/* Sichere Zahlung */}
              <div className="flex items-center gap-1 pr-3 border-r border-n-200">
                <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                <span className="text-[10px] font-semibold text-n-700 tracking-widest uppercase">Sichere Zahlung</span>
              </div>
              {/* Factura / Transferencia */}
              {paySettings.enable_invoice && (
                <div className="h-7 px-3 rounded-md bg-n-50 border border-n-200 flex items-center gap-1.5 shadow-sm">
                  <span className="text-sm">🏦</span>
                  <span className="text-[10px] font-bold text-n-700 tracking-tight">Rechnung</span>
                </div>
              )}
              {/* TWINT */}
              {paySettings.enable_twint && (
                <div className="h-7 px-2.5 rounded-md bg-black flex items-center shadow-sm">
                  <img src="/twint-logo.svg" alt="Telefon" className="h-5 w-auto" />
                </div>
              )}
              {/* Stripe → Visa + Mastercard */}
              {paySettings.enable_stripe && (
                <>
                  <div className="h-7 px-3.5 rounded-md bg-[#1A1F71] flex items-center shadow-sm">
                    <span className="font-black text-white text-sm italic tracking-tight">VISA</span>
                  </div>
                  <div className="h-7 px-3 rounded-md bg-white border border-n-200 flex items-center gap-1 shadow-sm">
                    <div className="w-4 h-4 rounded-full bg-[#EB001B] opacity-90" />
                    <div className="w-4 h-4 rounded-full bg-[#F79E1B] opacity-90 -ml-1.5" />
                    <span className="text-[10px] font-bold text-n-800 ml-1 tracking-tight">Mastercard</span>
                  </div>
                </>
              )}
              {/* PayPal */}
              {paySettings.enable_paypal && (
                <div className="h-7 px-2.5 rounded-md bg-white border border-n-200 flex items-center shadow-sm">
                  <img src="/0014294_paypal-express-payment-plugin.png" alt="PayPal" className="h-5 w-auto object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Social icons ── */}
      <div className="border-b border-n-200 py-4 bg-white">
        <div className="container mx-auto px-4 flex justify-center gap-6">
          {[
            { Icon: Facebook, href: "https://www.facebook.com/" },
            { Icon: Twitter, href: null },
            { Icon: Instagram, href: null },
          ].map(({ Icon, href }, i) =>
            href ? (
              <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center text-n-600 hover:text-brand transition-colors">
                <Icon className="w-5 h-5" />
              </a>
            ) : (
              <button key={i} className="w-9 h-9 flex items-center justify-center text-n-600 hover:text-brand transition-colors">
                <Icon className="w-5 h-5" />
              </button>
            )
          )}
        </div>
      </div>

      {/* ── El pie ────────────────────────────────────────────────────────
          Una sola columna centrada, del derecho y del revés igual: logo,
          contacto, mapa y enlaces, cada cosa debajo de la anterior y todo
          sobre el mismo eje. Antes eran dos columnas de alturas distintas y
          nada acababa cuadrando: el mapa alto a un lado, la lista corta al
          otro y medio pie en blanco. */}
      <div className="bg-white border-t border-n-150 py-14 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto flex flex-col items-center text-center">

            <img
              src="/sabitas/logo.png"
              alt="Sabitas"
              className="h-24 lg:h-28 w-auto object-contain"
            />

            {/* La costura, el mismo hilo que separa los bloques de la web.
                Cada pocos segundos unas tijeras la cortan de izquierda a
                derecha, y la linea desaparece a su paso. */}
            <span className="costura-tijeras my-7" aria-hidden>
              <span className="linea" />
              <span className="cortado" />
              <span className="tijeras">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="6" r="2.6" />
                  <circle cx="6" cy="18" r="2.6" />
                  <path d="M8.1 7.6 20 18" />
                  <path d="M8.1 16.4 20 6" />
                </svg>
              </span>
            </span>

            {/* Contacto */}
            <div className="flex flex-wrap justify-center gap-2">
              <a
                href={`https://maps.google.com/?q=${CONSULTA_MAPA}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-wash hover:bg-brand-tint border border-brand-tint text-n-700 text-[14px] px-4 py-2 rounded-full transition-colors"
              >
                <MapPin className="w-4 h-4 text-brand" />
                {LOCALIDAD_COMPLETA}
              </a>
              <a
                href={`tel:${CONTACTO.telefonoPlano}`}
                className="inline-flex items-center gap-2 bg-brand-wash hover:bg-brand hover:text-white border border-brand-tint text-brand font-semibold text-[14px] px-4 py-2 rounded-full transition-colors"
              >
                <Phone className="w-4 h-4" />
                {CONTACTO.telefono}
              </a>
              <a
                href={`mailto:${CONTACTO.email}`}
                className="inline-flex items-center gap-2 bg-brand-wash hover:bg-brand hover:text-white border border-brand-tint text-brand font-semibold text-[14px] px-4 py-2 rounded-full transition-colors"
              >
                <Mail className="w-4 h-4" />
                {CONTACTO.email}
              </a>
            </div>

            {/* El mapa, del ancho del bloque */}
            <a
              href={`https://maps.google.com/?q=${CONSULTA_MAPA}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group w-full rounded-2xl overflow-hidden border border-brand-tint mt-8"
              style={{ height: "200px" }}
            >
              <iframe
                title="Standort"
                src={`https://maps.google.com/maps?q=${CONSULTA_MAPA}&output=embed&z=14`}
                width="100%"
                height="100%"
                style={{ border: 0, height: "100%", pointerEvents: "none" }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <span className="absolute inset-0 bg-brand/0 group-hover:bg-brand/10 transition-colors flex items-end p-3">
                <span className="bg-white/90 text-brand text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
                  Auf Karte öffnen ↗
                </span>
              </span>
            </a>

            {/* Los enlaces, en una linea centrada y separados por un punto.
                Dos columnas con una lista corta a un lado dejaban el pie
                descuadrado; asi se lee de un vistazo y queda simetrico. */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2.5 mt-10">
              <a href="/kontakt" className="text-[14px] font-medium text-n-700 hover:text-brand transition-colors">Kontakt</a>
              <span className="text-brand-pale select-none" aria-hidden>·</span>
                <Dialog open={openModal === "rueckgabe"} onOpenChange={(open) => setOpenModal(open ? "rueckgabe" : null)}>
                  <DialogTrigger asChild>
                    <button className="text-[14px] font-medium text-n-700 hover:text-brand transition-colors">{legalContent.rueckgabe.title}</button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{legalContent.rueckgabe.title}</DialogTitle>
                    </DialogHeader>
                    <div className="whitespace-pre-line text-sm text-n-700">{legalContent.rueckgabe.content}</div>
                  </DialogContent>
                </Dialog>
                <span className="text-brand-pale select-none" aria-hidden>·</span>
                <Dialog open={openModal === "zahlungsarten"} onOpenChange={(open) => setOpenModal(open ? "zahlungsarten" : null)}>
                  <DialogTrigger asChild>
                    <button className="text-[14px] font-medium text-n-700 hover:text-brand transition-colors">{legalContent.zahlungsarten.title}</button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{legalContent.zahlungsarten.title}</DialogTitle>
                    </DialogHeader>
                    <div className="whitespace-pre-line text-sm text-n-700">{legalContent.zahlungsarten.content}</div>
                  </DialogContent>
                </Dialog>
                <span className="text-brand-pale select-none" aria-hidden>·</span>
              <a href="/ueber-mich" className="text-[14px] font-medium text-n-700 hover:text-brand transition-colors">Über mich</a>
                <span className="text-brand-pale select-none" aria-hidden>·</span>
                <Dialog open={openModal === "impressum"} onOpenChange={(open) => setOpenModal(open ? "impressum" : null)}>
                  <DialogTrigger asChild>
                    <button className="text-[14px] font-medium text-n-700 hover:text-brand transition-colors">{legalContent.impressum.title}</button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{legalContent.impressum.title}</DialogTitle>
                    </DialogHeader>
                    <div className="whitespace-pre-line text-sm text-n-700">{legalContent.impressum.content}</div>
                  </DialogContent>
                </Dialog>
                <span className="text-brand-pale select-none" aria-hidden>·</span>
                <Dialog open={openModal === "datenschutz"} onOpenChange={(open) => setOpenModal(open ? "datenschutz" : null)}>
                  <DialogTrigger asChild>
                    <button className="text-[14px] font-medium text-n-700 hover:text-brand transition-colors">{legalContent.datenschutz.title}</button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{legalContent.datenschutz.title}</DialogTitle>
                    </DialogHeader>
                    <div className="whitespace-pre-line text-sm text-n-700">{legalContent.datenschutz.content}</div>
                  </DialogContent>
                </Dialog>
            </div>

            {/* La tarjeta de visita, aparte: es una accion, no un enlace mas. */}
            <button
              onClick={handleDownloadVCard}
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full border border-brand-pale text-brand font-semibold text-[14px] hover:bg-brand-tint/60 transition-colors"
            >
              <Download className="w-4 h-4" />
              Digitale Visitenkarte
            </button>
          </div>
        </div>
      </div>

      {/* ── Install PWA CTA (oculto si ya está instalada como app) ── */}
      {!isStandalone && (
        <div className="bg-white border-t border-n-200 py-5">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
            <span className="text-sm text-n-700">Installieren Sie unsere App für schnelleren Zugriff</span>
            <InstallPWAButton />
          </div>
        </div>
      )}

      {/* ── Bottom copyright bar ── */}
      <div className="bg-n-50 border-t border-n-200 py-5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-n-500">
            <span className="flex items-center gap-3">
              <span>* Alle Preise inkl. MwSt., zzgl. Versandkosten</span>
              <span className="text-n-200 hidden md:inline">·</span>
              <span className="hidden md:flex items-center gap-1 text-n-400 text-xs">
                Design by&nbsp;<a href="https://lweb.ch" target="_blank" rel="noopener noreferrer" className="font-black tracking-tight text-n-700 hover:text-brand transition-colors uppercase text-[11px]">lweb.ch</a>
              </span>
            </span>
            <span className="font-semibold text-xs text-n-700">Copyright © 2026 Sabitas. Alle Rechte vorbehalten.</span>
            <span className="flex items-center gap-2">
              <span className="flex md:hidden items-center gap-1 text-n-400 text-xs">
                Design by&nbsp;<a href="https://lweb.ch" target="_blank" rel="noopener noreferrer" className="font-black tracking-tight text-n-700 hover:text-brand transition-colors uppercase text-[11px]">lweb.ch</a>
              </span>
              <AdminLoginButton subtle />
            </span>
          </div>
        </div>
      </div>

    </footer>
  )
}
