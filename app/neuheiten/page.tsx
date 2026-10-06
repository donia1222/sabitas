"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { useRouter } from "next/navigation"
import { getCachedCategories } from "@/lib/categories-cache"
import { ArrowLeft, Sparkles, Menu, Newspaper, Images, ShoppingCart, Truck, ShieldCheck, Package } from "lucide-react"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { LoginAuth } from "@/components/login-auth"
import { Footer } from "@/components/footer"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL



interface HighlightCard {
  id: number
  image: string
  icon: React.ReactNode
  badge: string
  title: string
  description: string
}

const CARDS: HighlightCard[] = [
  {
    id: 1,
    image: "/placeholder.jpg",
    icon: <Sparkles className="w-3.5 h-3.5 text-brand" />,
    badge: "Neu",
    title: "Neu im Sortiment",
    description: "Jede Woche kommen neue Artikel dazu. Hier siehst du zuerst, was gerade eingetroffen ist.",
  },
  {
    id: 2,
    image: "/placeholder.jpg",
    icon: <Truck className="w-3.5 h-3.5 text-brand" />,
    badge: "Versand",
    title: "Schnell geliefert",
    description: "Bestellungen bis 14 Uhr gehen am selben Tag raus. Versand in der ganzen Schweiz.",
  },
  {
    id: 3,
    image: "/placeholder.jpg",
    icon: <ShieldCheck className="w-3.5 h-3.5 text-brand" />,
    badge: "Garantie",
    title: "Sicher einkaufen",
    description: "30 Tage Rückgaberecht, sichere Zahlung mit TWINT, Karte oder PayPal.",
  },
  {
    id: 4,
    image: "/placeholder.jpg",
    icon: <Package className="w-3.5 h-3.5 text-brand" />,
    badge: "Auswahl",
    title: "Sorgfältig kuratiert",
    description: "Wir nehmen nur Produkte ins Sortiment, die wir selbst empfehlen würden.",
  },
  {
    id: 5,
    image: "/placeholder.jpg",
    icon: <Sparkles className="w-3.5 h-3.5 text-brand" />,
    badge: "Service",
    title: "Persönliche Beratung",
    description: "Fragen zu einem Artikel? Wir antworten in der Regel noch am selben Tag.",
  },
]


export default function NeuheitenPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([])
  const [paySettings, setPaySettings] = useState<{
    enable_paypal: boolean; enable_stripe: boolean; enable_twint: boolean; enable_invoice: boolean
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

  useEffect(() => {
    getCachedCategories().then(setCategories).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-n-50">

      {/* La misma cabecera que la portada: un solo sitio que mantener. */}
      <Header onCartOpen={() => router.push("/shop")} />

      {/* Page title */}
      <div className="max-w-5xl mx-auto px-4 pt-10 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-7 bg-brand rounded-full" />
          <h1 className="text-3xl font-black text-n-900 tracking-tight">Neue Edition</h1>
        </div>
        <p className="text-sm text-n-500 ml-4">Die neuesten Artikel im Sortiment und alles, was den Einkauf bei uns ausmacht.</p>
      </div>

      {/* First card — full width featured */}
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-2">
        <article className="bg-white rounded-3xl overflow-hidden border border-n-150 shadow-sm mb-8">
          <div className="h-[340px] sm:h-[420px] overflow-hidden bg-n-100">
            <img src={CARDS[0].image} alt={CARDS[0].title} className="w-full h-full object-cover" />
          </div>
          <div className="p-8 sm:p-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-brand bg-brand/8 px-3 py-1 rounded-full">
                {CARDS[0].icon}
                {CARDS[0].badge}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-n-900 tracking-tight leading-tight mb-4">{CARDS[0].title}</h2>
            <div className="w-12 h-1 bg-brand rounded-full mb-5" />
            <p className="text-base text-n-700 leading-[1.85]">{CARDS[0].description}</p>
          </div>
        </article>

        {/* Section header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-brand rounded-full" />
          <h2 className="text-xl font-black text-n-900 tracking-tight">Unser Sortiment</h2>
        </div>

        {/* Cards grid — 2x2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-12">
          {CARDS.slice(1).map(card => (
            <article
              key={card.id}
              className="bg-white rounded-3xl overflow-hidden border border-n-150 shadow-md"
            >
              <div className="h-64 overflow-hidden bg-n-100">
                <img src={card.image} alt={card.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand bg-brand/8 px-3 py-1 rounded-full mb-3">
                  {card.icon}
                  {card.badge}
                </span>
                <h2 className="font-black text-n-900 text-lg leading-tight mb-2">{card.title}</h2>
                <div className="w-8 h-0.5 bg-brand rounded-full mb-3" />
                <p className="text-sm text-n-600 leading-relaxed">{card.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  )
}
