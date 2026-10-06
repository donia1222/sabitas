"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { BannerPagina } from "@/components/banner-pagina"
import { useRouter } from "next/navigation"
import { getCachedCategories } from "@/lib/categories-cache"
import { ArrowLeft, ChevronLeft, X, ChevronRight, Images, Menu, Newspaper, Download, ShoppingCart, Gift } from "lucide-react"
import { Footer } from "@/components/footer"
import { CtaContacto } from "@/components/cta-contacto"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { LoginAuth } from "@/components/login-auth"

interface GalleryImage {
  id: number
  title: string | null
  image: string
  image_url: string
  created_at: string
}

function Lightbox({ images, startIndex, onClose }: { images: GalleryImage[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") setIdx(i => (i + 1) % images.length)
      if (e.key === "ArrowLeft") setIdx(i => (i - 1 + images.length) % images.length)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [images.length, onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/92" />

      <img
        src={images[idx].image_url}
        alt={images[idx].title ?? ""}
        className="relative z-10 max-w-[92vw] max-h-[88vh] object-contain rounded-2xl shadow-2xl select-none"
        onClick={e => e.stopPropagation()}
      />

      {/* Title */}
      {images[idx].title && (
        <div className="absolute bottom-14 z-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-sm font-semibold px-5 py-2 rounded-full">
          {images[idx].title}
        </div>
      )}

      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length) }}
            className="absolute left-4 z-20 w-11 h-11 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white rotate-180" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % images.length) }}
            className="absolute right-16 z-20 w-11 h-11 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-5 z-20 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setIdx(i) }}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function GalleryPage() {
  const router = useRouter()
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [categories, setCategories] = useState<{ id: number; slug: string; name: string; parent_id: number | null }[]>([])
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set())
  const [headerVisible, setHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY
      if (currentY < 10) {
        setHeaderVisible(true)
      } else if (currentY > lastScrollY && currentY > 100) {
        setHeaderVisible(false)
      } else if (currentY < lastScrollY) {
        setHeaderVisible(true)
      }
      setLastScrollY(currentY)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [lastScrollY])

  useEffect(() => {
    fetch("/api/gallery")
      .then(r => r.json())
      .then(d => { if (d.success) setImages(d.images) })
      .catch(() => {})
      .finally(() => setLoading(false))
    getCachedCategories().then(setCategories).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-n-50">

      {/* La misma cabecera que la portada: un solo sitio que mantener. */}
      <Header onCartOpen={() => router.push("/shop")} />

      <BannerPagina
        miga="Galerie"
        titulo="Unsere Galerie"
        subtitulo="Inspirationen & Unikate"
        texto="Einblicke in meine Handarbeit – entdecke liebevolle Details, besondere Stoffe und einzigartige Stücke, die bereits ein neues Zuhause gefunden haben."
        foto="/sabitas/telas-e-hilos.jpg"
      />

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-white rounded-2xl border border-n-150 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && images.length === 0 && (
          <div className="text-center py-32">
            <Images className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-n-300 font-semibold text-lg">Noch keine Bilder vorhanden.</p>
          </div>
        )}

        {!loading && images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, i) => (
              <div
                key={img.id}
                onClick={() => setLightboxIndex(i)}
                className="bg-white rounded-2xl overflow-hidden border border-brand-tint shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-zoom-in group"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={img.image_url}
                    alt={img.title ?? ""}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                {img.title && (
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-semibold text-n-700 leading-snug">{img.title}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
      {/* La misma llamada de contacto que en la portada. */}
      <CtaContacto separada />

      <Footer />
    </div>
  )
}
