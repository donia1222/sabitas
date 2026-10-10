"use client"

import { useState, useEffect, Suspense } from "react"
import { features } from "@/lib/features"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { ProcesoSection } from "@/components/proceso-section"
import { CtaContacto } from "@/components/cta-contacto"
import { ReviewsSection } from "@/components/reviews-section"
import { Anuncio } from "@/components/anuncio"
import { EtiquetaCosida } from "@/components/titulo-cosido"
import { HeroSection } from "@/components/hero-section"
import { BlogBanner } from "@/components/blog-banner"
import { GalleryBanner } from "@/components/gallery-banner"
import { HighlightBanner } from "@/components/highlight-banner"
import { GutscheinBanner } from "@/components/gutschein-banner"
import { ShoppingCartComponent } from "@/components/shopping-cart"
import { CheckoutPage } from "@/components/checkout-page"
import { Footer } from "@/components/footer"
import { FadeSection } from "@/components/fade-section"
import { avisarCarrito } from "@/lib/carrito"

interface Product {
  id: number
  name: string
  price: number
  image: string
  description: string
  heatLevel: number
  rating: number
  badge?: string
  origin?: string
}

interface CartItem extends Product {
  quantity: number
  isCombo?: boolean
  comboId?: string
  originalPrice?: number
  discount?: number
}

function StorefrontInner() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [purchasedItems, setPurchasedItems] = useState<Set<number>>(new Set())
  const [purchasedCombos, setPurchasedCombos] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState<"store" | "checkout">("store")
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const searchParams = useSearchParams()

  // 💾 Cargar carrito desde localStorage al iniciar
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cantina-cart')
      if (saved) {
        const data: CartItem[] = JSON.parse(saved)
        setCart(data)
      }
    } catch {}
    localStorage.removeItem('cart-should-be-cleared')
    setIsInitialLoad(false)
    if (searchParams.get("checkout") === "true") {
      setCurrentPage("checkout")
    }
    // Retorno desde Stripe TWINT — montar checkout para mostrar confirmación
    if (searchParams.get("twint_order") && searchParams.get("redirect_status")) {
      setCurrentPage("checkout")
    }
  }, [])


  // 🔄 Guardar carrito en localStorage cada vez que cambie (pero no durante la carga inicial)
  useEffect(() => {
    if (!isInitialLoad) {
      if (cart.length > 0) {
        localStorage.setItem("cantina-cart", JSON.stringify(cart))
        avisarCarrito()
      } else {
        localStorage.removeItem("cantina-cart")
        avisarCarrito()
      }
    }
  }, [cart, isInitialLoad])

  // 🧹 Verificar si el carrito debe ser limpiado (cuando se navega de vuelta desde success)
  useEffect(() => {
    const checkClearCart = () => {
      const shouldClearCart = localStorage.getItem('cart-should-be-cleared')
      if (shouldClearCart === 'true') {
        console.log('🧹 PERIODIC: Limpiando carrito por flag cart-should-be-cleared')
        localStorage.removeItem('cart-should-be-cleared')
        clearCart()
      }
    }

    // Verificar cuando se carga la página
    checkClearCart()
    
    // Verificar periódicamente cada segundo para detectar cambios
    const interval = setInterval(checkClearCart, 1000)
    
    // Escuchar eventos de storage para detectar cambios desde otras pestañas/ventanas
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cart-should-be-cleared' && e.newValue === 'true') {
        console.log('🧹 STORAGE EVENT: Recibido evento de storage para limpiar carrito')
        checkClearCart()
      }
    }
    
    // Escuchar evento personalizado de PayPal
    const handlePayPalClearCart = (e: CustomEvent) => {
      console.log('🎯 Evento PayPal cart clear recibido:', e.detail)
      checkClearCart()
    }
    
    // Escuchar mensajes de postMessage desde success page
    const handlePostMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CLEAR_CART' && e.data?.source === 'paypal-success') {
        console.log('📨 PostMessage de limpieza de carrito recibido')
        checkClearCart()
      }
    }
    
    // También verificar cuando se cambia el foco
    window.addEventListener('focus', checkClearCart)
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('paypal-cart-clear', handlePayPalClearCart as EventListener)
    window.addEventListener('message', handlePostMessage)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', checkClearCart)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('paypal-cart-clear', handlePayPalClearCart as EventListener)
      window.removeEventListener('message', handlePostMessage)
    }
  }, [])

  // 👁️ Verificar limpieza del carrito cuando la página se vuelve visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Verificar múltiples fuentes de truth para la limpieza del carrito
        const shouldClearCart = localStorage.getItem('cart-should-be-cleared')
        const lastPayment = localStorage.getItem("last-payment")
        
        if (shouldClearCart === 'true') {
          console.log('🧹 Limpiando carrito por flag cart-should-be-cleared')
          localStorage.removeItem('cart-should-be-cleared')
          clearCart()
        }
        
        // Verificar si hay un pago reciente completado y carrito aún tiene items
        if (lastPayment && cart.length > 0) {
          try {
            const paymentInfo = JSON.parse(lastPayment)
            const paymentTime = new Date(paymentInfo.timestamp)
            const now = new Date()
            const diffMinutes = (now.getTime() - paymentTime.getTime()) / (1000 * 60)
            
            // Si el pago fue hace menos de 10 minutos y está marcado como completado
            if (diffMinutes < 10 && paymentInfo.status === "completed") {
              console.log('🧹 Limpiando carrito por pago reciente completado')
              clearCart()
            }
          } catch (error) {
            console.error("Error checking payment for cart cleanup:", error)
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [cart])

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id && !item.isCombo)
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id && !item.isCombo ? { ...item, quantity: item.quantity + quantity } : item,
        )
      }
      return [...prevCart, { ...product, quantity }]
    })
  }

  const removeFromCart = (productId: number) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === productId)
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map((item) => (item.id === productId ? { ...item, quantity: item.quantity - 1 } : item))
      }
      return prevCart.filter((item) => item.id !== productId)
    })
  }

  // 🗑️ Nueva función para limpiar el carrito completamente
  const clearCart = () => {
    console.log('🧹 CLEARING CART: Limpiando carrito completamente, items actuales:', cart.length)
    setCart([])
    localStorage.removeItem("cantina-cart")
    avisarCarrito()
    console.log('✅ CART CLEARED: Carrito limpiado exitosamente')
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const markAsPurchased = (productId: number) => {
    setPurchasedItems((prev) => new Set([...prev, productId]))
    setTimeout(() => {
      setPurchasedItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(productId)
        return newSet
      })
    }, 3000)
  }

  const markComboAsPurchased = (comboId: string) => {
    setPurchasedCombos((prev) => new Set([...prev, comboId]))
    setTimeout(() => {
      setPurchasedCombos((prev) => {
        const newSet = new Set(prev)
        newSet.delete(comboId)
        return newSet
      })
    }, 3000)
  }

  const goToCheckout = () => {
    setCurrentPage("checkout")
    setIsCartOpen(false)
  }

  const backToStore = () => {
    setCurrentPage("store")
    // No limpiar carrito aquí automáticamente - se limpia cuando el pago se confirma
  }

  // 🛒 Renderizar página de checkout
  if (currentPage === "checkout") {
    return (
      <CheckoutPage
        cart={cart}
        onBackToStore={backToStore}
        onClearCart={clearCart}
        onAddToCart={(product) => addToCart(product)}
        onRemoveFromCart={removeFromCart}
      />
    )
  }

  // 🏪 Renderizar página principal del store
  return (
    <div className="bg-white">

      {/* El aviso que ella escribe en el panel, si hay alguno activo. */}
      <Anuncio />

      <Header onCartOpen={() => setIsCartOpen(true)} cartCount={getTotalItems()} />

      <HeroSection />

      {/* Como nace cada pieza: tres pasos, los mismos que en su web. */}
      <FadeSection>
        <ProcesoSection />
      </FadeSection>

      {/* Bloque editorial: titular de seccion + banners, sobre fondo papel */}
      <FadeSection>
        <section className="py-16 md:py-20 bg-canvas border-t border-n-150">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mb-8 md:mb-10">
              <EtiquetaCosida>Entdecken</EtiquetaCosida>
              <h2
                className="font-display font-semibold text-ink mt-4 leading-tight"
                style={{ fontSize: "clamp(2rem, 4.2vw, 2.8rem)", letterSpacing: "-0.03em" }}
              >
                Aus dem Atelier
              </h2>
              <p className="text-n-500 text-sm md:text-base mt-3 leading-relaxed">
                Neue Serien, Notizen zur Entstehung der Bilder und Blicke ins Atelier.
              </p>
            </div>

            {/* Escalonados: el destacado, y 120ms despues cada uno de los
                dos de abajo. Entrando a la vez parecia un salto; asi se lee
                como que la seccion se va montando sola. */}
            <FadeSection delay={120} className="mb-4">
              <HighlightBanner />
            </FadeSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FadeSection delay={240}>
                <BlogBanner />
              </FadeSection>
              <FadeSection delay={360}>
                <GalleryBanner />
              </FadeSection>
            </div>
          </div>
        </section>
      </FadeSection>

      {/* Los vales son del paquete 3. Ver lib/features.ts */}
      {features.vales && (
        <FadeSection>
          <GutscheinBanner />
        </FadeSection>
      )}
      {/* Las reseñas: el molde esta puesto y se rellena cuando lleguen las
          suyas. Las que venian eran de la tienda de pesca. */}
      <FadeSection>
        <ReviewsSection />
      </FadeSection>

      <ShoppingCartComponent
        isOpen={isCartOpen}
        onOpenChange={setIsCartOpen}
        cart={cart}
        onAddToCart={addToCart}
        onRemoveFromCart={removeFromCart}
        onGoToCheckout={goToCheckout}
        onClearCart={clearCart}
      />

      {/* La llamada de contacto, justo encima del pie. */}
      <FadeSection>
        <CtaContacto />
      </FadeSection>

      <Footer />
    </div>
  )
}

export default function Storefront() {
  return (
    <Suspense>
      <StorefrontInner />
    </Suspense>
  )
}