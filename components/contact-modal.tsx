"use client"

import { X, Mail, Phone } from "lucide-react"

const PHONE_DISPLAY = "078 613 80 84"
const PHONE_HREF = "tel:+41786138084"
const EMAIL = "hello@sabitas.ch"

export default function ContactModal({
  open,
  onClose,
  subject,
}: {
  open: boolean
  onClose: () => void
  subject?: string
}) {
  if (!open) return null
  const mailHref = `mailto:${EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-black text-gray-900 mb-1">Kontakt aufnehmen</h3>
        <p className="text-sm text-gray-500 mb-5">Für Versand oder Abholung im Laden.</p>
        <div className="space-y-3">
          <a
            href={mailHref}
            className="flex items-center gap-3 rounded-xl border border-gray-200 hover:border-brand hover:bg-brand-wash px-4 py-3 transition-colors"
          >
            <Mail className="w-5 h-5 text-brand flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">E-Mail</p>
              <p className="text-xs text-gray-500 truncate">{EMAIL}</p>
            </div>
          </a>
          <a
            href={PHONE_HREF}
            className="flex items-center gap-3 rounded-xl border border-gray-200 hover:border-brand hover:bg-brand-wash px-4 py-3 transition-colors"
          >
            <Phone className="w-5 h-5 text-brand flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">Telefon</p>
              <p className="text-xs text-gray-500">{PHONE_DISPLAY}</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
