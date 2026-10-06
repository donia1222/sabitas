"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { getCachedProducts } from "@/lib/products-cache"
import { getCachedCategories } from "@/lib/categories-cache"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Flame, Star, ShoppingCart, Minus, Plus, MapPin, Award, Info, ChevronLeft, ChevronRight } from "lucide-react"
import { ShoppingCartComponent } from "./shopping-cart"
import { CheckoutPage } from "@/components/checkout-page"
import { ProductImage } from "./product-image"

// Actualizar la interfaz para incluir category y stock
interface Product {
  id?: number
  name: string
  description: string
  price: number
  image?: string
  image_url?: string // Ensure this is properly typed
  image_urls?: (string | null)[] // Array de URLs de imágenes
  image_url_candidates?: string[]
  heatLevel: number
  rating: number
  badge: string
  origin: string
  category?: string
  stock?: number
  created_at?: string
  updated_at?: string
}

// API Response interface (snake_case from API)
interface ApiProduct {
  id?: number
  name: string
  description: string
  price: number
  image?: string
  image_url?: string
  image_urls?: (string | null)[] // Array de URLs de imágenes
  image_url_candidates?: string[]
  heat_level: number
  rating: number
  badge: string
  origin: string
  category?: string
  stock?: number
  created_at?: string
  updated_at?: string
}

interface ApiResponse {
  success: boolean
  products: ApiProduct[]
  total?: number
  stats?: {
    total_products: number
    hot_sauces: number
    bbq_sauces: number
  }
  error?: string
}

interface CartItem {
  id: number
  name: string
  price: number
  image: string
  image_url?: string
  description: string
  heatLevel: number
  rating: number
  badge?: string
  origin?: string
  quantity: number
}

interface ProductsGridProps {
  onAddToCart?: (product: Product, quantity: number) => void
  purchasedItems?: Set<number>
  onMarkAsPurchased?: (productId: number) => void
  cart?: CartItem[]
  onRemoveFromCart?: (productId: number) => void
  onClearCart?: () => void
  onGoToCheckout?: () => void
}

export default function ProductsGridCompact({
  onAddToCart = () => {},
  purchasedItems = new Set(),
  onMarkAsPurchased = () => {},
  cart: parentCart,
  onRemoveFromCart: parentRemoveFromCart,
  onClearCart: parentClearCart,
  onGoToCheckout: parentGoToCheckout,
}: ProductsGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [visibleProducts, setVisibleProducts] = useState<Set<number>>(new Set())
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set())
  const [activeTab, setActiveTab] = useState("all")
  const [categories, setCategories] = useState<{ id: number; slug: string; name: string }[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [stats, setStats] = useState({ hot_sauces: 0, bbq_sauces: 0, total_products: 0 })
  const [cartCount, setCartCount] = useState(0)
  const [animatingProducts, setAnimatingProducts] = useState<Set<number>>(new Set())
  const [cartBounce, setCartBounce] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [currentView, setCurrentView] = useState<"products" | "checkout" | "success">("products")
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<number, number>>({})
  const [modalImageIndex, setModalImageIndex] = useState<number>(0)
  const [modalQuantity, setModalQuantity] = useState<number>(1)
  const [visibleCount, setVisibleCount] = useState(20)
  const cartRef = useRef<HTMLDivElement>(null)

  // Note: activeCart variables will be defined after the handler functions

  // API_BASE_URL no longer needed — now using Next.js /api routes with caching

  // Cargar productos, categorías y carrito
  useEffect(() => {
    loadProducts()
    loadCategories()
    loadCartFromStorage()
  }, [])

  // Funciones de localStorage para el carrito
  const saveCartToStorage = (cartData: CartItem[]) => {
    try {
      localStorage.setItem('cantina-cart', JSON.stringify(cartData))
      const totalItems = cartData.reduce((sum, item) => sum + item.quantity, 0)
      localStorage.setItem('cantina-cart-count', totalItems.toString())
    } catch (error) {
      console.error('Error saving cart to localStorage:', error)
    }
  }

  const loadCartFromStorage = () => {
    try {
      const savedCart = localStorage.getItem('cantina-cart')
      const savedCount = localStorage.getItem('cantina-cart-count')
      const savedPurchasedItems = localStorage.getItem('cantina-purchased-items')
      
      if (savedCart) {
        const cartData: CartItem[] = JSON.parse(savedCart)
        setCart(cartData)
        
        if (savedCount) {
          setCartCount(parseInt(savedCount))
        } else {
          // Recalcular count si no está guardado
          const totalItems = cartData.reduce((sum, item) => sum + item.quantity, 0)
          setCartCount(totalItems)
        }
        
        // Marcar productos como añadidos si están en el carrito
        const addedProductIds = new Set(cartData.map(item => item.id))
        setAddedItems(addedProductIds)
      }
      
      // Cargar productos marcados como comprados
      if (savedPurchasedItems) {
        const purchasedIds: number[] = JSON.parse(savedPurchasedItems)
        // Aquí podrías usar onMarkAsPurchased si necesitas notificar al componente padre
        // Por ahora solo mantenemos el estado local
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error)
    }
  }

  // Escuchar eventos del chat para abrir modales específicos
  useEffect(() => {
    const handleOpenProductModal = (event: any) => {
      const { productId, productData } = event.detail
      console.log(`🎯 Recibido evento para abrir modal del producto ${productId}:`, productData)
      
      // Buscar el producto real en nuestra lista de productos
      const realProduct = products.find(p => p.id === productId)
      if (realProduct) {
        console.log(`✅ Producto encontrado en la lista:`, realProduct)
        setSelectedProduct(realProduct)
        setIsModalOpen(true)
      } else {
        console.log(`⚠️ Producto no encontrado en la lista, usando datos del chat`)
        // Convertir los datos del chat al formato de Product
        const chatProduct: Product = {
          id: productData.id,
          name: productData.name,
          description: `Información detallada sobre ${productData.name}`,
          price: productData.price,
          image_url: productData.image,
          image_urls: productData.image ? [productData.image] : [],
          stock: productData.stock || 0,
          heatLevel: productData.heatLevel,
          rating: 4.5, // Valor por defecto
          badge: productData.badge,
          origin: 'USA', // Valor por defecto
          category: 'bbq-sauce'
        }
        setSelectedProduct(chatProduct)
        setIsModalOpen(true)
      }
    }

    window.addEventListener('openProductModal', handleOpenProductModal)
    return () => {
      window.removeEventListener('openProductModal', handleOpenProductModal)
    }
  }, [products])

  // Sincronizar addedItems con el carrito para mostrar el estado visual correcto
  useEffect(() => {
    const currentCart = parentCart || cart
    const addedProductIds = new Set(currentCart.map(item => item.id))
    setAddedItems(addedProductIds)
    
    // Update cart count based on active cart
    const totalItems = currentCart.reduce((sum, item) => sum + item.quantity, 0)
    setCartCount(totalItems)
  }, [parentCart, cart])

  // Animación escalonada
  useEffect(() => {
    if (products.length > 0) {
      setVisibleProducts(new Set())
      
      const timer = setTimeout(() => {
        const filteredProducts = getFilteredProducts()
        filteredProducts.forEach((product, index) => {
          setTimeout(() => {
            setVisibleProducts((prev) => new Set([...prev, index]))
          }, index * 50)
        })
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [products, activeTab])

  const loadCategories = async () => {
    try {
      const cats = await getCachedCategories()
      setCategories(cats)
    } catch {}
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError("")
      const { products: raw, stats } = await getCachedProducts()
      const normalizedProducts: Product[] = raw.map((product: ApiProduct) => ({
        ...product,
        heatLevel: product.heat_level || 0,
        stock: product.stock || 0,
        image_url: product.image_url || product.image || "/placeholder.svg",
        image_urls: product.image_urls || [],
      }))
      setProducts(normalizedProducts)
      if (stats) setStats(stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar productos")
      console.error("Error loading products:", err)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredProducts = () => {
    const base = activeTab === "all" ? products : products.filter((p) => p.category === activeTab)
    return base.filter((p) => (p.stock ?? 1) > 0)
  }

  const renderHeatLevel = (level: number, size: "sm" | "lg" = "sm") => {
    const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4"
    return Array.from({ length: 5 }, (_, i) => (
      <Flame
        key={i}
        className={`${iconSize} transition-colors duration-300 ${
          i < level ? "text-red-500 fill-red-500" : "text-gray-300"
        }`}
      />
    ))
  }

  const renderStars = (rating: number, size: "sm" | "lg" = "sm") => {
    const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4"
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${iconSize} transition-all duration-300 ${
          i < Math.floor(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
        }`}
      />
    ))
  }

  const updateQty = useCallback((id: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[id] ?? 1
      const next = Math.min(10, Math.max(1, current + delta))
      return { ...prev, [id]: next }
    })
  }, [])

  const getQty = (id: number) => quantities[id] ?? 1

  // Funciones para navegar entre imágenes - estabilizadas con useCallback
  const getCurrentImageIndex = useCallback((productId: number) => currentImageIndex[productId] ?? 0, [currentImageIndex])
  
  const nextImage = useCallback((productId: number, totalImages: number) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [productId]: ((prev[productId] ?? 0) + 1) % totalImages
    }))
  }, [])
  
  const prevImage = useCallback((productId: number, totalImages: number) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [productId]: ((prev[productId] ?? 0) - 1 + totalImages) % totalImages
    }))
  }, [])

  const getValidImages = (product: Product): string[] => {
    return (product.image_urls || [])
      .filter((url): url is string => url !== null && url !== undefined && url !== "" && typeof url === 'string')
  }


  // Funciones del carrito con persistencia
  const addToCartHandler = (product: any) => {
    const cartItem: CartItem = {
      id: product.id!,
      name: product.name,
      price: product.price,
      image: product.image_url || product.image || "/placeholder.svg",
      image_url: product.image_url, // Preserve the full URL
      description: product.description,
      heatLevel: product.heatLevel,
      rating: product.rating,
      badge: product.badge,
      origin: product.origin,
      quantity: 1,
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === cartItem.id)
      let newCart
      if (existingItem) {
        newCart = prevCart.map((item) => (item.id === cartItem.id ? { ...item, quantity: item.quantity + 1 } : item))
      } else {
        newCart = [...prevCart, cartItem]
      }
      
      // Guardar en localStorage
      saveCartToStorage(newCart)
      return newCart
    })
  }

  const removeFromCartHandler = (productId: number) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === productId)
      let newCart
      if (existingItem && existingItem.quantity > 1) {
        newCart = prevCart.map((item) => (item.id === productId ? { ...item, quantity: item.quantity - 1 } : item))
      } else {
        newCart = prevCart.filter((item) => item.id !== productId)
      }
      
      // Guardar en localStorage
      saveCartToStorage(newCart)
      return newCart
    })

    // Actualizar contador del carrito
    setCartCount((prev) => Math.max(0, prev - 1))
  }

  const clearCartHandler = () => {
    setCart([])
    setCartCount(0)
    // Limpiar localStorage
    try {
      localStorage.removeItem('cantina-cart')
      localStorage.removeItem('cantina-cart-count')
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error)
    }
  }

  const goToCheckoutHandler = () => {
    setIsCartOpen(false)
    setCurrentView("checkout")
  }

  // Use parent cart when available, otherwise use local cart
  const activeCart = parentCart || cart
  const activeRemoveFromCart = parentRemoveFromCart || removeFromCartHandler
  const activeClearCart = parentClearCart || clearCartHandler
  const activeGoToCheckout = parentGoToCheckout || goToCheckoutHandler

  const handleOrderComplete = () => {
    setCurrentView("success")
    clearCartHandler() // Esto ya limpia localStorage
  }

  const handleBackToProducts = () => {
    setCurrentView("products")
  }

  const handlePurchase = (product: Product, event?: React.MouseEvent, fromModal?: boolean) => {
    // Check if product is in stock
    if ((product.stock || 0) === 0) {
      return
    }

    // Si viene del modal, agregar al carrito con animación y cerrar modal
    if (fromModal) {
      onAddToCart(product, getQty(product.id!))
      onMarkAsPurchased(product.id!)
      addToCartHandler(product)
      setCartCount((prev) => prev + getQty(product.id!))
      setCartBounce(true)
      setTimeout(() => setCartBounce(false), 600)
      setAddedItems((prev) => new Set([...prev, product.id!]))
      
      // Cerrar modal con animación nativa del Dialog
      setIsModalOpen(false)
      
      setTimeout(() => {
        setAddedItems((prev) => {
          const newSet = new Set(prev)
          newSet.delete(product.id!)
          return newSet
        })
      }, 2000)
      return
    }
    // Obtener la posición del elemento que se está animando
    const target = event?.currentTarget as HTMLElement
    const rect = target?.getBoundingClientRect()
    const cartRect = cartRef.current?.getBoundingClientRect()

    // Crear elemento de animación mejorado
    if (rect && cartRect) {
      const flyingElement = document.createElement("div")
      flyingElement.className = "flying-product-enhanced"
      flyingElement.innerHTML = `
      <div style="
        position: relative;
        width: 80px; 
        height: 80px; 
        background: linear-gradient(135deg, #1C1C1C, #A8763E);
        border-radius: 16px;
        padding: 8px;
        box-shadow: 0 20px 40px rgba(46, 31, 15, 0.4);
        border: 3px solid white;
      ">
        <img src="${product.image_url ? product.image_url + '.jpg' : '/placeholder.svg'}" alt="${product.name}"
             style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;"
             onerror="var e=['jpg','JPG','jpeg','JPEG','png'];var b=(this.dataset.base||this.src).replace(/\\.(jpg|JPG|jpeg|JPEG|png)$/,'');this.dataset.base=b;var i=e.indexOf(this.src.split('.').pop());if(i+1<e.length){this.src=b+'.'+e[i+1];}else{this.onerror=null;this.src='/placeholder.svg';}" />
        <div style="
          position: absolute;
          top: -8px;
          right: -8px;
          background: #A8763E;
          color: white;
          font-size: 12px;
          font-weight: 900;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.5);
        ">+1</div>
        <div style="
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
          border-radius: 16px;
          animation: shimmer 1s ease-in-out;
        "></div>
      </div>
    `

      // Posicionar el elemento
      flyingElement.style.position = "fixed"
      flyingElement.style.left = `${rect.left + rect.width / 2 - 40}px`
      flyingElement.style.top = `${rect.top + rect.height / 2 - 40}px`
      flyingElement.style.zIndex = "10000"
      flyingElement.style.pointerEvents = "none"
      flyingElement.style.transition = "all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)"

      document.body.appendChild(flyingElement)

      // Crear efecto de trail/estela
      const trail = document.createElement("div")
      trail.className = "flying-trail"
      trail.style.position = "fixed"
      trail.style.left = `${rect.left + rect.width / 2 - 2}px`
      trail.style.top = `${rect.top + rect.height / 2 - 2}px`
      trail.style.width = "4px"
      trail.style.height = "4px"
      trail.style.background = "linear-gradient(45deg, #1C1C1C, #A8763E)"
      trail.style.borderRadius = "50%"
      trail.style.zIndex = "9999"
      trail.style.boxShadow = "0 0 20px #A8763E"
      trail.style.transition = "all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)"

      document.body.appendChild(trail)

      // Animar hacia el carrito con efecto más dramático
      setTimeout(() => {
        flyingElement.style.left = `${cartRect.left + cartRect.width / 2 - 40}px`
        flyingElement.style.top = `${cartRect.top + cartRect.height / 2 - 40}px`
        flyingElement.style.transform = "scale(0.2) rotate(360deg)"
        flyingElement.style.opacity = "0"

        trail.style.left = `${cartRect.left + cartRect.width / 2 - 2}px`
        trail.style.top = `${cartRect.top + cartRect.height / 2 - 2}px`
        trail.style.transform = "scale(3)"
        trail.style.opacity = "0"
      }, 100)

      // Limpiar después de la animación
      setTimeout(() => {
        if (document.body.contains(flyingElement)) {
          document.body.removeChild(flyingElement)
        }
        if (document.body.contains(trail)) {
          document.body.removeChild(trail)
        }
      }, 1300)
    }

    // Resto de la función permanece igual...
    setAnimatingProducts((prev) => new Set([...prev, product.id!]))

    setTimeout(() => {
      onAddToCart(product, getQty(product.id!))
      onMarkAsPurchased(product.id!)
      addToCartHandler(product)
      setCartCount((prev) => prev + getQty(product.id!))
      setCartBounce(true)
      setTimeout(() => setCartBounce(false), 600)
      setAddedItems((prev) => new Set([...prev, product.id!]))
      setAnimatingProducts((prev) => {
        const newSet = new Set(prev)
        newSet.delete(product.id!)
        return newSet
      })

      setTimeout(() => {
        setAddedItems((prev) => {
          const newSet = new Set(prev)
          newSet.delete(product.id!)
          return newSet
        })
      }, 2000)
    }, 200)
  }

  // Componente del carrito flotante - EXACTAMENTE IGUAL
  const FloatingCart = () => (
    <div
      ref={cartRef}
      onClick={() => setIsCartOpen(true)}
      className={`fixed top-4 right-8 z-50 group cursor-pointer transition-all duration-500 ${
        cartBounce ? "animate-cart-bounce" : ""
      }`}
    >
      {/* Glow effect background */}
      <div className="absolute inset-0 bg-highlight rounded-xl blur-lg opacity-20 group-hover:opacity-40 transition-all duration-300 scale-110"></div>

      {/* Main cart button */}
      <div className="relative bg-ink-deep rounded-xl p-3 shadow-xl border border-highlight/30 group-hover:scale-105 transition-all duration-300">
        {/* Cart icon */}
        <div className="relative">
          <ShoppingCart className="w-5 h-5 text-white" />

          {/* Animated pulse ring when items are added */}
          {cartCount > 0 && <div className="absolute inset-0 rounded-full border-2 border-highlight/50 animate-ping"></div>}

          {/* Count badge */}
          {cartCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-highlight text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-black shadow-lg border-2 border-white">
              {cartCount > 99 ? "99+" : cartCount}
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap backdrop-blur-sm">
        {cartCount > 0 ? `${cartCount} Artikel im Warenkorb` : "Warenkorb öffnen"}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black/80 rotate-45"></div>
      </div>
    </div>
  )

  // Componente del modal de información detallada - Completamente aislado
  const ProductDetailModal = memo(({ product }: { product: Product }) => {
    const validImages = getValidImages(product)
    const [modalCurrentImageIndex, setModalCurrentImageIndex] = useState(0)
    const [modalCurrentQuantity, setModalCurrentQuantity] = useState(1)
    const hasMultipleImages = validImages.length > 1
    
    // Inicializar valores cuando se abre el modal
    useEffect(() => {
      setModalCurrentImageIndex(getCurrentImageIndex(product.id!))
      setModalCurrentQuantity(getQty(product.id!))
    }, [product.id])
    
    // Handlers estables con useCallback para evitar re-renders del modal
    const handlePrevImage = useCallback(() => {
      setModalCurrentImageIndex(prev => 
        (prev - 1 + validImages.length) % validImages.length
      )
    }, [validImages.length])
    
    const handleNextImage = useCallback(() => {
      setModalCurrentImageIndex(prev => 
        (prev + 1) % validImages.length
      )
    }, [validImages.length])
    
    const handleImageSelect = useCallback((index: number) => {
      setModalCurrentImageIndex(index)
    }, [])
    
    const handleQuantityChange = useCallback((delta: number) => {
      setModalCurrentQuantity(prev => {
        const next = Math.min(10, Math.max(1, prev + delta))
        // Actualizar también el estado global
        updateQty(product.id!, delta)
        return next
      })
    }, [product.id])

    return (
      <DialogContent className="max-w-4xl max-h-[95vh] w-[95vw] sm:w-[90vw] overflow-y-auto bg-white rounded-lg sm:rounded-xl">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 bg-white leading-tight pr-8">
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 bg-white text-gray-900 p-1 sm:p-4 rounded-lg">
          {/* Galería de imágenes */}
          <div className="relative order-1 lg:order-none">
            <div className="relative overflow-hidden rounded-lg sm:rounded-xl shadow-lg">
              {validImages.length > 0 ? (
                <img
                  src={validImages[modalCurrentImageIndex]}
                  alt={`${product.name} - Imagen ${modalCurrentImageIndex + 1}`}
                  className="w-full h-48 sm:h-64 md:h-72 lg:h-80 object-cover transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg?height=300&width=300"
                  }}
                />
              ) : (
                <ProductImage
                  src={product.image_url}
                  candidates={product.image_url_candidates}
                  alt={product.name}
                  className="w-full h-48 sm:h-64 md:h-72 lg:h-80 object-cover transition-transform duration-300"
                />
              )}
              
              {/* Navegación de imágenes */}
              {hasMultipleImages && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute left-1 sm:left-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white border-gray-300 shadow-md w-8 h-8 sm:w-10 sm:h-10 p-0"
                    onClick={handlePrevImage}
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white border-gray-300 shadow-md w-8 h-8 sm:w-10 sm:h-10 p-0"
                    onClick={handleNextImage}
                  >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  
                  {/* Indicadores de imagen */}
                  <div className="absolute bottom-2 sm:bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1 sm:gap-2">
                    {validImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handleImageSelect(index)}
                        className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all shadow-sm ${
                          index === modalCurrentImageIndex ? 'bg-white scale-110' : 'bg-white/60'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            
            {/* Miniaturas */}
            {hasMultipleImages && (
              <div className="flex gap-2 mt-2 sm:mt-3 overflow-x-auto pb-2 scrollbar-hide">
                {validImages.map((imageUrl, index) => (
                  <button
                    key={index}
                    onClick={() => handleImageSelect(index)}
                    className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === modalCurrentImageIndex ? 'border-highlight scale-105' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={imageUrl}
                      alt={`${product.name} - Miniatura ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=64&width=64"
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            <Badge
              className="absolute top-2 sm:top-3 left-2 sm:left-3 text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1 font-medium shadow-lg bg-[#CC0000] text-white"
            >
              {product.badge}
            </Badge>
          </div>

          {/* Información detallada */}
          <div className="space-y-3 sm:space-y-4 order-2 lg:order-none">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm sm:text-base text-gray-600">Herkunft: {product.origin}</span>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Beschreibung</h4>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{product.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Bewertung</h4>
                <div className="flex items-center gap-2">
                  <div className="flex">{renderStars(product.rating, "lg")}</div>
                  <span className="font-medium text-gray-700 text-sm sm:text-base">{product.rating}/5</span>
                </div>
              </div>

              <div>
               
              </div>
            </div>

            {/* Stock information */}
            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Verfügbarkeit</h4>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  (product.stock || 0) > 0 ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className={`font-medium text-sm sm:text-base ${
                  (product.stock || 0) > 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {(product.stock || 0) > 0 ? `${product.stock} auf Lager` : 'Nicht verfügbar'}
                </span>
              </div>
            </div>

            <div className="border-t pt-3 sm:pt-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                <div className="text-xl sm:text-2xl font-bold text-n-900">
                  {(product.price * modalCurrentQuantity).toFixed(2)} CHF
                </div>
                <div className="text-xs sm:text-sm text-gray-500">Einzelpreis: {product.price.toFixed(2)} CHF</div>
              </div>

              {/* Controles de cantidad */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuantityChange(-1)}
                  className="px-2 sm:px-3 py-2 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900 h-8 sm:h-10 w-8 sm:w-10"
                >
                  <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
                <span className="px-3 sm:px-4 py-2 font-semibold text-base sm:text-lg text-gray-900 min-w-[40px] text-center">
                  {modalCurrentQuantity}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuantityChange(1)}
                  className="px-2 sm:px-3 py-2 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900 h-8 sm:h-10 w-8 sm:w-10"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>

              {/* Botón de compra */}
              <Button
                onClick={() => {
                  // Actualizar la cantidad global antes de la compra
                  setQuantities(prev => ({ ...prev, [product.id!]: modalCurrentQuantity }))
                  handlePurchase(product, undefined, true)
                }}
                disabled={purchasedItems.has(product.id!) || (product.stock || 0) === 0}
                className={`w-full font-semibold py-3 sm:py-4 rounded-lg transition-all duration-500 shadow-md hover:shadow-lg text-sm sm:text-base ${
                  purchasedItems.has(product.id!) || addedItems.has(product.id!)
                    ? "bg-green-600 hover:bg-green-700"
                    : (product.stock || 0) === 0
                      ? "bg-gray-500 hover:bg-gray-600"
                      : "bg-brand hover:bg-brand-dark"
                } disabled:opacity-50 disabled:cursor-not-allowed text-white`}
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                {(product.stock || 0) === 0 ? "Ausverkauft" : (purchasedItems.has(product.id!) || addedItems.has(product.id!) ? "Gekauft" : "In den Warenkorb")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    )
  })

  // MEJORADO: Tarjeta de producto con mejor diseño para pantallas grandes
  const renderEnhancedProductCard = (product: Product, index: number) => {
    const validImages = getValidImages(product)
    const currentIndex = getCurrentImageIndex(product.id!)
    const hasMultipleImages = validImages.length > 1

    return (
      <Card
        key={product.id}
        className={`group relative bg-white border border-n-200 hover:border-brand hover:shadow-md transition-all duration-300 rounded-none overflow-hidden ${
          visibleProducts.has(index) ? "animate-slide-in opacity-100" : "opacity-0 translate-y-4"
        } ${addedItems.has(product.id!) ? "animate-success-glow" : ""} ${
          animatingProducts.has(product.id!) ? "animate-compress" : ""
        }`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <CardContent className="p-4 lg:p-6">
          {/* MEJORADO: Layout que cambia según el tamaño de pantalla */}
          <div className="flex gap-4 lg:gap-6">
            {/* MEJORADO: Imagen con carousel */}
            <div className="relative w-20 h-20 lg:w-32 lg:h-32 flex-shrink-0">
              <div className="relative w-full h-full rounded-lg overflow-hidden">
                {validImages.length > 0 ? (
                  <img
                    src={validImages[currentIndex]}
                    alt={`${product.name} - Imagen ${currentIndex + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 shadow-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=128&width=128"
                    }}
                  />
                ) : (
                  <ProductImage
                    src={product.image_url}
                    candidates={product.image_url_candidates}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 shadow-md"
                  />
                )}
                
                {/* Navegación de imágenes solo visible en hover */}
                {hasMultipleImages && (
                  <>
                    <button
                      onClick={() => prevImage(product.id!, validImages.length)}
                      className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70"
                    >
                      <ChevronLeft className="w-3 h-3 lg:w-4 lg:h-4" />
                    </button>
                    <button
                      onClick={() => nextImage(product.id!, validImages.length)}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70"
                    >
                      <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4" />
                    </button>
                    
                    {/* Indicadores de imagen */}
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
                      {validImages.map((_, imgIndex) => (
                        <div
                          key={imgIndex}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            imgIndex === currentIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <Badge
                className={`absolute -top-1 -right-1 lg:-top-2 lg:-right-2 text-xs px-1.5 py-0.5 lg:px-2 lg:py-1 font-medium shadow-sm ${
                  product.category === "bbq-sauce" ? "bg-highlight text-white" : "bg-ink-deep text-white"
                }`}
              >
                {product.badge}
              </Badge>
              
              {/* Contador de imágenes */}
              {hasMultipleImages && (
                <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {currentIndex + 1}/{validImages.length}
                </div>
              )}
            </div>

            {/* MEJORADO: Contenido principal con mejor espaciado */}
            <div className="flex-1 min-w-0">
                   <h4 className="text-lg lg:text-xl xl:text-2xl font-bold text-n-900 line-clamp-1 lg:line-clamp-2 group-hover:text-brand transition-colors duration-300 flex-1 mr-2">
                  {product.name}
                </h4>
              {/* MEJORADO: Header con título y precio mejor distribuidos */}
              <div className="flex items-start justify-between mb-2 lg:mb-3">
           
                <div className="text-lg lg:text-xl xl:text-1xl font-bold text-n-900 flex-shrink-0">{product.price.toFixed(2)} CHF</div>
              </div>

              {/* MEJORADO: Descripción visible en pantallas grandes */}
              <p className="hidden lg:block text-gray-600 text-sm xl:text-base mb-3 xl:mb-4 line-clamp-2 leading-relaxed">
                {product.description}
              </p>

              {/* MEJORADO: Rating y origen con mejor espaciado */}
              <div className="flex items-center justify-between mb-3 lg:mb-4 text-sm">
                <div className="flex items-center gap-1 lg:gap-2">
                  <div className="flex">{renderStars(product.rating)}</div>
                  <span className="text-gray-600 ml-1 font-medium">{product.rating}</span>
               
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <MapPin className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="font-medium text-xs lg:text-sm">{product.origin}</span>
                </div>
              </div>

              {/* Stock information */}
              <div className="flex items-center gap-2 mb-3 lg:mb-4">
                <div className={`w-2 h-2 rounded-full ${
                  (product.stock || 0) > 0 ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className={`text-xs lg:text-sm font-medium ${
                  (product.stock || 0) > 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {(product.stock || 0) > 0 ? `auf Lager` : 'Ausverkauft'}
                </span>
              </div>

              {/* MEJORADO: Botones con ancho apropiado y mejor diseño */}
              <div className="flex items-center gap-2 lg:gap-3">
                <Dialog open={isModalOpen && selectedProduct?.id === product.id} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-auto min-w-[100px] lg:min-w-[120px] text-sm bg-white hover:bg-canvas border-n-150 text-ink-deep hover:text-ink-deep font-medium"
                      onClick={() => {
                        setSelectedProduct(product)
                        setIsModalOpen(true)
                      }}
                      data-product-modal={product.id}
                    >
                      <Info className="w-4 h-4 mr-1" />
                      Mehr Info
                    </Button>
                  </DialogTrigger>
                  {selectedProduct && selectedProduct.id === product.id && <ProductDetailModal product={selectedProduct} />}
                </Dialog>

                <Button
                  onClick={(e) => handlePurchase(product, e)}
                  disabled={purchasedItems.has(product.id!) || animatingProducts.has(product.id!) || (product.stock || 0) === 0}
                  size="sm"
                  className={`w-auto min-w-[120px] lg:min-w-[150px] font-semibold transition-all duration-300 ${
                    purchasedItems.has(product.id!) || addedItems.has(product.id!)
                      ? "bg-green-600 hover:bg-green-700"
                      : (product.stock || 0) === 0
                        ? "bg-gray-400 hover:bg-gray-500"
                        : product.category === "bbq-sauce"
                          ? "bg-highlight hover:bg-ink-deep"
                          : "bg-ink-deep hover:bg-highlight"
                  } disabled:opacity-50 disabled:cursor-not-allowed text-white`}
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  {(product.stock || 0) === 0
                    ? "Ausverkauft"
                    : purchasedItems.has(product.id!) || addedItems.has(product.id!)
                      ? "✓ Gekauft"
                      : animatingProducts.has(product.id!)
                        ? "Wird hinzugefügt..."
                        : "Kaufen"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Página de éxito - EXACTAMENTE IGUAL
  const SuccessPage = () => (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bestellung erfolgreich!</h1>
        <p className="text-gray-600 mb-6">Vielen Dank für Ihre Bestellung. Sie erhalten eine Bestätigungs-E-Mail.</p>
        <Button onClick={handleBackToProducts} className="bg-red-500 hover:bg-red-600 text-white">
          Weiter einkaufen
        </Button>
      </div>
    </div>
  )

  // NAVEGACIÓN EXACTAMENTE IGUAL - NO CAMBIADA
  if (currentView === "checkout") {
    return (
      <CheckoutPage 
        cart={cart} 
        onBackToStore={handleBackToProducts} 
        onClearCart={clearCartHandler}
        onAddToCart={addToCartHandler}
        onRemoveFromCart={removeFromCartHandler}
      />
    )
  }

  if (currentView === "success") {
    return <SuccessPage />
  }

  if (loading) {
    return (
      <section className="py-12 px-4 bg-white min-h-screen">
        <div className="max-w-4xl lg:max-w-7xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto"></div>
          <p className="mt-4 text-gray-600">Produkte werden geladen...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="py-12 px-4 bg-white min-h-screen">
        <div className="max-w-4xl lg:max-w-7xl mx-auto text-center">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-semibold">Fehler beim Laden der Produkte</p>
            <p className="text-sm">{error}</p>
            <Button onClick={loadProducts} className="mt-4" variant="outline">
              Erneut versuchen
            </Button>
          </div>
        </div>
      </section>
    )
  }

  const filteredProducts = getFilteredProducts()
  const paginatedProducts = filteredProducts.slice(0, visibleCount)

  return (
    <>
      <ShoppingCartComponent
        isOpen={isCartOpen}
        onOpenChange={setIsCartOpen}
        cart={activeCart}
        onAddToCart={addToCartHandler}
        onRemoveFromCart={activeRemoveFromCart}
        onGoToCheckout={activeGoToCheckout}
        onClearCart={activeClearCart}
      />
      <section className="py-12 px-4 bg-white min-h-screen">
        {/* MEJORADO: Container más ancho para pantallas grandes */}
        <div className="max-w-4xl lg:max-w-7xl mx-auto">
          {/* MEJORADO: Header con mejor tipografía */}
          <div className="mb-8 animate-fade-in-up border-b border-n-200 pb-4">
            <h3 className="text-2xl font-bold text-n-900">Empfohlene Produkte</h3>
            <p className="text-sm text-n-600 mt-1">Für jeden Bedarf das Richtige. <button className="text-brand hover:underline">Alle anzeigen</button></p>
          </div>

          {/* Tabs dinámicos desde la API */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8 lg:mb-10">
            <TabsList
              className="flex overflow-x-auto gap-1 w-full bg-white border border-n-200 p-1 scrollbar-hide rounded-none"
            >
              <TabsTrigger
                value="all"
                className="flex-shrink-0 rounded-none data-[state=active]:bg-brand data-[state=active]:text-white font-medium transition-all duration-200 text-sm px-4 py-2 text-n-700 hover:text-brand hover:bg-brand-wash"
              >
                Alle
              </TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.slug}
                  value={cat.slug}
                  className="flex-shrink-0 rounded-none data-[state=active]:bg-brand data-[state=active]:text-white font-medium transition-all duration-200 text-sm px-4 py-2 text-n-700 hover:text-brand hover:bg-brand-wash"
                >
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="mt-6 lg:mt-8">
              <div className="text-center mb-6 lg:mb-8">
                <p className="text-gray-600 text-sm lg:text-lg">
                  {filteredProducts.length} {filteredProducts.length === 1 ? "Produkt" : "Produkte"} verfügbar
                </p>
              </div>

              {/* Grid de productos paginado */}
              <div className="grid gap-4 lg:gap-6 xl:gap-8 md:grid-cols-2">
                {paginatedProducts.map((product, index) => renderEnhancedProductCard(product, index))}
              </div>

              {filteredProducts.length === 0 && !loading && (
                <div className="text-center py-12 lg:py-16">
                  <p className="text-gray-500 lg:text-lg mb-6">Keine Produkte in dieser Kategorie gefunden</p>
                  <Button onClick={() => setActiveTab("all")} className="mt-4" variant="outline" size="lg">
                    Alle anzeigen
                  </Button>
                </div>
              )}

              {/* Botón cargar más */}
              {visibleCount < filteredProducts.length && (
                <div className="text-center mt-8">
                  <p className="text-sm text-n-600 mb-3">
                    {paginatedProducts.length} von {filteredProducts.length} Produkten
                  </p>
                  <Button
                    onClick={() => setVisibleCount((prev) => prev + 20)}
                    variant="outline"
                    className="border-brand text-brand hover:bg-brand hover:text-white px-8 py-3 rounded-none font-semibold"
                  >
                    20 weitere Produkte anzeigen
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* MEJORADO: CSS con mejor responsividad */}
        <style jsx>{`
          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes success-glow {
            0%, 100% {
              box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
            }
            50% {
              box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
            }
          }

          @keyframes compress {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(0.95);
            }
            100% {
              transform: scale(1);
            }
          }

          @keyframes cart-bounce {
            0%, 100% {
              transform: scale(1) rotate(0deg);
            }
            25% {
              transform: scale(1.1) rotate(-5deg);
            }
            50% {
              transform: scale(1.2) rotate(5deg);
            }
            75% {
              transform: scale(1.1) rotate(-2deg);
            }
          }

          @keyframes shimmer {
            0% {
              opacity: 0;
            }
            50% {
              opacity: 1;
            }
            100% {
              opacity: 0;
            }
          }
          
          .animate-fade-in-up {
            animation: fade-in-up 0.6s ease-out forwards;
          }
          
          .animate-slide-in {
            animation: slide-in 0.4s ease-out forwards;
          }
          
          .animate-success-glow {
            animation: success-glow 1s ease-in-out;
          }

          .animate-compress {
            animation: compress 0.3s ease-in-out;
          }

          .animate-cart-bounce {
            animation: cart-bounce 0.6s ease-in-out;
          }
          
          .line-clamp-1 {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .flying-product-enhanced {
            transition: all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            filter: drop-shadow(0 10px 30px rgba(184, 134, 78, 0.5));
          }

          .flying-trail {
            transition: all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          }
        `}</style>
      </section>
    </>
  )
}