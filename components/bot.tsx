"use client"

import type React from "react"
import { useState, useEffect, useRef, type ChangeEvent } from "react"
import { marked } from "marked"
import DOMPurify from "dompurify"
import { X, Trash2, SendHorizontal, Loader2, Flame, MessageSquare, Plus, ChevronLeft, ChevronRight, Minus } from "lucide-react"
import { systemPrompt } from "./chatPrompt"
import { getCachedProducts } from "@/lib/products-cache"

// Extendemos el tipo Message para incluir productos detectados
type Message = {
  role: "system" | "user" | "assistant"
  content: string
  detectedProducts?: DetectedProduct[] // Nueva propiedad para productos detectados
}

type ChatResponse = {
  response?: string
  error?: string
}

// Estructura para productos detectados automáticamente
type DetectedProduct = {
  id: number
  name: string
  image: string
  price: number
  badge: string
  heatLevel: number
  stock?: number
}

// Base de datos de productos que se carga dinámicamente desde la API
let productDatabase: DetectedProduct[] = []

async function loadProductsFromAPI(): Promise<DetectedProduct[]> {
  try {
    const { products } = await getCachedProducts()
    return products.map((p: any) => ({
      id: p.id,
      name: p.name,
      image: p.image_url || "/placeholder.svg?height=128&width=128",
      price: p.price,
      badge: p.badge,
      heatLevel: p.heat_level,
      stock: p.stock
    }))
  } catch {
    return []
  }
}

// Función inteligente para detectar productos mencionados en el texto
function detectProductsInText(responseText: string): DetectedProduct[] {
  const detectedProducts: DetectedProduct[] = []
  const lowerResponseText = responseText.toLowerCase()
  
  console.log('🔍 Detectando productos en texto:', lowerResponseText)
  console.log('📦 Base de datos tiene', productDatabase.length, 'productos')
  
  // Para cada producto en nuestra base de datos, verificamos si es mencionado
  productDatabase.forEach(product => {
    // Creamos variantes de búsqueda más específicas y precisas
    const productName = product.name.toLowerCase()
    const searchVariants = []
    
    // Solo agregamos el nombre completo del producto
    searchVariants.push(productName)
    
    // Nombre sin prefijo "Big Red's - " (más específico)
    if (productName.includes('big red\'s - ')) {
      searchVariants.push(productName.replace(/big red's - /, ''))
    }
    
    // Variantes específicas SOLO para productos comunes mencionados frecuentemente
    if (productName.includes('honey') && productName.includes('bbq')) {
      searchVariants.push('honey bbq sauce', 'honey bbq')
    }
    if (productName.includes('garlic') && productName.includes('bbq')) {
      searchVariants.push('garlic bbq sauce', 'garlic bbq')
    }
    if (productName.includes('carolina') && productName.includes('bbq')) {
      searchVariants.push('carolina-style bbq', 'carolina style bbq', 'carolina bbq')
    }
    if (productName.includes('chipotle') && productName.includes('bbq')) {
      searchVariants.push('chipotle bbq sauce', 'chipotle bbq')
    }
    if (productName.includes('habanero')) {
      searchVariants.push('habanero sauce', 'habanero')
    }
    if (productName.includes('heat wave')) {
      searchVariants.push('heat wave', 'heatwave')
    }
    
    // Filtrar variantes válidas y limpiar duplicados
    const validVariants = [...new Set(searchVariants)]
      .filter(variant => variant && variant.length > 3) // Mínimo 4 caracteres para evitar matches cortos
      .map(variant => variant.trim())
    
    // Solo buscar matches MUY específicos
    const isAlreadyDetected = detectedProducts.some(dp => dp.id === product.id)
    
    // Buscar matches MUY específicos usando word boundaries para evitar falsos positivos
    const matchedVariant = validVariants.find(variant => {
      // Crear patrón con word boundaries para match exacto
      const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      
      // Para BBQ sauces, buscar el nombre específico con diferentes variantes
      if (variant.includes('bbq') || variant.includes('sauce')) {
        const patterns = [
          new RegExp(`\\b${escapedVariant}\\b`, 'i'), // Nombre exacto
          new RegExp(`\\b${escapedVariant} sauce\\b`, 'i'), // Con "sauce"
          new RegExp(`\\bdie ${escapedVariant}\\b`, 'i'), // Con artículo "die"
          new RegExp(`\\b${escapedVariant}\\s+\\(`, 'i'), // Seguido de paréntesis (para menciones con detalles)
        ]
        return patterns.some(pattern => pattern.test(responseText))
      }
      
      // Para otros productos, buscar con word boundaries
      const pattern = new RegExp(`\\b${escapedVariant}\\b`, 'i')
      return pattern.test(responseText)
    })
    
    if (matchedVariant && !isAlreadyDetected) {
      console.log(`✅ Producto detectado: "${product.name}" por variante: "${matchedVariant}"`)
      detectedProducts.push(product)
    }
  })
  
  console.log('🎯 Productos detectados:', detectedProducts.map(p => p.name))
  return detectedProducts
}

// Componente visual para mostrar productos detectados con navegación - Versión responsiva
function DetectedProductsDisplay({ products, onCloseChat }: { products: DetectedProduct[]; onCloseChat?: () => void }) {
  if (products.length === 0) return null
  
  // Función para hacer scroll suave a la sección de productos y abrir modal
  const scrollToProducts = (productId?: number) => {
    // Cerrar el chat automáticamente en pantallas pequeñas (móviles)
    const isMobile = window.innerWidth < 640 // sm breakpoint
    if (isMobile && onCloseChat && typeof onCloseChat === 'function') {
      onCloseChat()
    }
    
    const offersSection = document.getElementById('offers')
    if (offersSection) {
      // Realizar scroll suave hacia la sección
      offersSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      })
      
      // Opcional: Agregar un efecto visual para destacar la sección
      offersSection.classList.add('highlight-section')
      setTimeout(() => {
        offersSection.classList.remove('highlight-section')
      }, 2000)
      
      // Si tenemos un productId específico, abrir el modal del producto
      if (productId) {
        // Delay más largo para que termine el scroll primero
        setTimeout(() => {
          console.log(`🔍 Buscando producto con ID: ${productId}`)
          
          // Obtener datos del producto del chat
          const productData = productDatabase.find(p => p.id === productId)
          if (!productData) {
            console.log(`❌ No se encontraron datos para producto ${productId}`)
            return
          }
          
          console.log(`📝 Datos del producto:`, productData)
          
          // Buscar el producto en el DOM por nombre (más confiable que por ID)
          const productCards = document.querySelectorAll('.group')
          let foundButton: Element | null = null
          
          for (const card of productCards) {
            const titleElement = card.querySelector('h4')
            if (titleElement && titleElement.textContent) {
              const cardTitle = titleElement.textContent.toLowerCase().trim()
              const productName = productData.name.toLowerCase().trim()
              
              console.log(`🔍 Comparando: "${cardTitle}" con "${productName}"`)
              
              // Búsqueda exacta por nombre para evitar coincidencias incorrectas
              if (cardTitle === productName) {
                foundButton = card.querySelector('[data-product-modal]')
                console.log(`✅ Producto encontrado por nombre exacto: ${cardTitle}`)
                break
              }
              
              // Búsqueda alternativa sin prefijos "Big Red's -" o "Big Red's  -" si no hay match exacto
              const normalizedCardTitle = cardTitle.replace(/^big red's\s+-\s+/i, '')
              const normalizedProductName = productName.replace(/^big red's\s+-\s+/i, '')
              
              if (normalizedCardTitle === normalizedProductName) {
                foundButton = card.querySelector('[data-product-modal]')
                console.log(`✅ Producto encontrado por nombre normalizado: ${cardTitle}`)
                break
              }
            }
          }
          
          if (foundButton) {
            console.log(`✅ Abriendo modal para producto: ${productData.name}`)
            
            // Crear evento personalizado para comunicar el producto al grid
            const event = new CustomEvent('openProductModal', { 
              detail: {
                productId: productData.id, 
                productData: productData,
                searchByName: true
              } 
            })
            window.dispatchEvent(event)
            
            // Pequeño delay para destacar visualmente el producto
            setTimeout(() => {
              // Destacar visualmente el producto (sin clic redundante)
              const productCard = foundButton.closest('.group')
              if (productCard) {
                productCard.classList.add('highlight-product')
                setTimeout(() => {
                  productCard.classList.remove('highlight-product')
                }, 3000)
              }
            }, 100)
          } else {
            console.log(`❌ No se encontró producto con nombre: ${productData.name}`)
            // Fallback: destacar la sección general
            const offersSection = document.getElementById('offers')
            if (offersSection) {
              offersSection.classList.add('highlight-section')
              setTimeout(() => {
                offersSection.classList.remove('highlight-section')
              }, 2000)
            }
          }
        }, 1000) // Delay de 1 segundo para asegurar que el scroll termine completamente
      }
    }
  }
  
  return (
    <div className="border-t border-gray-200 pt-3 sm:pt-3 mt-3 sm:mt-3">
      <p className="text-sm text-gray-500 mb-2 sm:mb-2 font-medium">Erwähnte Produkte (klicken für Details):</p>
      <div className="flex flex-wrap gap-2 sm:gap-2">
        {products.map(product => (
          <div 
            key={product.id} 
            onClick={() => scrollToProducts(product.id)}
            className="flex items-center gap-2 sm:gap-2 bg-canvas border border-n-150 p-2 sm:p-2 rounded-lg hover:bg-canvas transition-all duration-200 cursor-pointer group transform hover:scale-105 active:scale-95 mobile-product-card"
            title={`Klicken um ${product.name} im Shop zu sehen`}
          >
            {/* Imagen en miniatura con efecto hover */}
            <div className="relative flex-shrink-0">
              <img 
                src={product.image} 
                alt={product.name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-md sm:rounded-lg object-cover shadow-sm group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  // Fallback a placeholder si la imagen no carga
                  const target = e.target as HTMLImageElement
                  target.src = "/placeholder.svg?height=32&width=32"
                }}
              />
              {/* Badge del producto superpuesto */}
              <div className="absolute -top-1 -right-1 bg-highlight text-white text-xs px-1 py-0.5 rounded text-[10px] sm:text-[11px] font-bold shadow-sm">
                {product.badge}
              </div>
            </div>
            
            {/* Información del producto */}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-gray-800 line-clamp-1 group-hover:text-highlight transition-colors duration-200">
                {product.name}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-600 font-medium group-hover:text-highlight transition-colors duration-200">
                  {product.price.toFixed(2)} CHF
                </span>
                {/* Indicador visual de nivel de picor */}
                <div className="flex">
                  {Array.from({ length: Math.min(product.heatLevel, 3) }, (_, i) => (
                    <Flame key={i} className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-highlight fill-highlight group-hover:text-highlight transition-colors duration-200" />
                  ))}
                  {product.heatLevel > 3 && <span className="text-xs text-highlight ml-0.5">+</span>}
                </div>
              </div>
            </div>
            
            {/* Indicador visual de que es clickeable */}
            <div className="hidden xs:block ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
              <div className="w-4 h-4 rounded-full bg-highlight flex items-center justify-center">
                <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Texto explicativo sutil */}
      <p className="text-xs text-gray-400 mt-2 italic">
        💡 Tipp: Klicken Sie auf ein Produkt, um es im Shop zu sehen
      </p>
    </div>
  )
}

export default function SpaceChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showClearIcon, setShowClearIcon] = useState(false)
  const [showChatButton, setShowChatButton] = useState(true)
  const [availableQuestions, setAvailableQuestions] = useState<string[]>([])
  const [visibleQuestions, setVisibleQuestions] = useState<string[]>([])

  // Estados para el flujo de contacto
  const [contactStep, setContactStep] = useState(0)
  const [contactReason, setContactReason] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactMessage, setContactMessage] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [hasAutoOpened, setHasAutoOpened] = useState(false)

  // Array de preguntas sobre productos de cuero
  const allQuestions = [
    "Welche Portemonnaies haben Sie für Damen?",
    "Was ist der Unterschied zwischen den Lederarten?",
    "Wie pflege ich mein Lederportemonnaie richtig?",
    "Haben Sie Produkte für Herren?",
    "Bieten Sie kostenlosen Versand?",
    "Welches Portemonnaie empfehlen Sie als Geschenk?",
    "Wie lange hält ein Lederportemonnaie?",
    "Welche Zahlungsmethoden akzeptieren Sie?",
    "Gibt es gravierbare Produkte?",
    "Was macht GLUTWERK Produkte besonders?",
    "Wie lange dauert die Lieferung?",
    "Kann ich ein Portemonnaie umtauschen?",
    "Welches Material verwenden Sie?",
    "Haben Sie Unisex-Modelle?",
    "Wie erkenne ich hochwertiges Leder?",
    "Gibt es Rabatte für Großbestellungen?",
    "Wie entferne ich Flecken vom Leder?",
    "Was ist der Unterschied zwischen Voll- und Spaltleder?",
    "Haben Sie limitierte Editionen?",
    "Welches Portemonnaie passt zum Business-Look?",
  ]

  useEffect(() => {
    // Cargar mensajes previos del localStorage con manejo de productos detectados
    const storedMessages = localStorage.getItem("smokehouseChatMessages")
    if (storedMessages) {
      try {
        const parsedMessages = JSON.parse(storedMessages) as Message[]
        setMessages(parsedMessages)
        // Mostrar botón de limpiar si hay mensajes guardados
        if (parsedMessages.length > 0) {
          setShowClearIcon(true)
        }
      } catch (error) {
        console.error("Error loading stored messages:", error)
      }
    }
    initializeQuestions()
  }, [])

  useEffect(() => {
    // Guardar en localStorage cada vez que cambien los mensajes
    localStorage.setItem("smokehouseChatMessages", JSON.stringify(messages))
    // Actualizar visibilidad del botón según si hay mensajes
    setShowClearIcon(messages.length > 0)
    scrollToBottom()
  }, [messages])

  const initializeQuestions = () => {
    const initialVisible = allQuestions.slice(0, 12)
    const remaining = allQuestions.slice(12)
    setVisibleQuestions(initialVisible)
    setAvailableQuestions(remaining)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Función principal modificada para detectar productos en respuestas
  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return

    // Convertimos a minúsculas para detectar palabras clave de contacto
    const lowerText = messageContent.toLowerCase()

    // Palabras clave que activan el flujo de contacto
    const contactKeywords = [
      "kontakt",
      "kontaktieren", 
      "nachricht senden",
      "anfrage",
      "großhandel",
      "wholesale",
      "großbestellung",
      "restaurant",
      "gastronomie",
      "verkostung",
      "beratung",
      "fragen",
      "hilfe",
      "support",
      "kundenservice"
    ]

    // Si detectamos palabras de contacto, activamos el flujo
    if (contactKeywords.some((kw) => lowerText.includes(kw))) {
      setContactStep(1)
      setInput("")
      return
    }

    // Si no, mandamos el mensaje a la IA
    setIsLoading(true)

    const newMessages: Message[] = [...messages, { role: "user", content: messageContent }]
    const lastMessages = newMessages.slice(-10)

    const messagesToSend: Message[] = [{ role: "system", content: systemPrompt }, ...lastMessages]

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesToSend }),
      })

      const data: ChatResponse = await response.json()

      if (data.response) {
        const htmlFromMarkdown = marked(data.response) as string
        const sanitizedHTML = DOMPurify.sanitize(htmlFromMarkdown)

        // ¡AQUÍ ESTÁ LA MAGIA! Detectamos productos en la respuesta de la IA
        const detectedProducts = detectProductsInText(data.response)
        
        console.log("Productos detectados en respuesta:", detectedProducts) // Para debugging

        // Creamos el mensaje del asistente con productos detectados incluidos
        const assistantMessage: Message = {
          role: "assistant", 
          content: sanitizedHTML,
          detectedProducts: detectedProducts // Adjuntamos los productos detectados
        }

        const updatedMessages: Message[] = [...newMessages, assistantMessage]

        setMessages(updatedMessages)
        setInput("")
      } else if (data.error) {
        console.error("Error del servidor:", data.error)
      }
    } catch (error) {
      console.error("Fallo al enviar el mensaje:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Enviar consulta a WhatsApp y resetear flujo
  const sendContactRequest = () => {
    const whatsappNumber = "+41786138084"

    const message = `Hallo, ich habe eine Anfrage zu Ihren Lederprodukten.

Betreff: ${contactReason}
Name: ${contactName}
E-Mail: ${contactEmail}

Nachricht:
${contactMessage}`

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")

    // Reiniciar flujo
    setContactStep(0)
    setContactReason("")
    setContactName("")
    setContactEmail("")
    setContactMessage("")
  }

  // Detectar clic en pregunta sugerida
  const handleQuestionClick = (question: string) => {
    sendMessage(question)

    const newVisible = visibleQuestions.filter((q) => q !== question)
    if (availableQuestions.length > 0) {
      const [nextQ, ...remainQ] = availableQuestions
      newVisible.push(nextQ)
      setAvailableQuestions(remainQ)
    }
    setVisibleQuestions(newVisible)
  }

  // Borrar todo el chat
  const clearChat = () => {
    setMessages([])
    localStorage.removeItem("smokehouseChatMessages")
  }

  // Crecimiento automático del textarea
  const autoResizeTextarea = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target
    setInput(target.value)
    target.style.height = "40px"
    target.style.overflowY = "auto"
  }

  // Ocultar o mostrar botón del chat según scroll
  useEffect(() => {
    let lastScrollY = window.pageYOffset

    const handleScroll = () => {
      const currentScrollY = window.pageYOffset
      if (currentScrollY > lastScrollY) {
        setShowChatButton(false)
      } else {
        setShowChatButton(true)
      }
      lastScrollY = currentScrollY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Ajustar meta viewport en móvil
  useEffect(() => {
    const metaViewport = document.querySelector("meta[name=viewport]")
    if (metaViewport) {
      metaViewport.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0")
    }

    return () => {
      if (metaViewport) {
        metaViewport.setAttribute("content", "width=device-width, initial-scale=1.0")
      }
    }
  }, [])

  // Cargar productos desde la API cuando se monta el componente
  useEffect(() => {
    const initializeProducts = async () => {
      try {
        const products = await loadProductsFromAPI()
        productDatabase.length = 0 // Limpiar productos existentes
        productDatabase.push(...products) // Agregar nuevos productos
        console.log(`Cargados ${products.length} productos desde la API`)
      } catch (error) {
        console.error('Error al inicializar productos:', error)
      }
    }
    
    initializeProducts()
  }, [])

  // Auto-open chat after 30 seconds on first visit (only on large screens)
  useEffect(() => {
    const isLargeScreen = () => window.innerWidth >= 1024
    const hasVisitedBefore = sessionStorage.getItem("smokehouseChatAutoOpened")
    
    if (!hasVisitedBefore && isLargeScreen() && !hasAutoOpened && !isOpen) {
      const timer = setTimeout(() => {
        setIsOpen(true)
        setHasAutoOpened(true)
        sessionStorage.setItem("smokehouseChatAutoOpened", "true")
      }, 30000) // 30 seconds
      
      return () => clearTimeout(timer)
    }
  }, [hasAutoOpened, isOpen])

  // Renderiza formulario de contacto - Versión responsiva
  const renderContactFlow = () => {
    return (
      <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <button
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-n-400 hover:bg-ink-deep text-white rounded-lg transition-colors duration-200 font-medium text-xs sm:text-sm"
            onClick={() => {
              setContactStep(0)
            }}
          >
            Abbrechen
          </button>
          {contactStep > 1 && (
            <button 
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 font-medium text-xs sm:text-sm"
              onClick={() => setContactStep(contactStep - 1)}
            >
              Zurück
            </button>
          )}
        </div>

        {contactStep === 1 && (
          <div className="text-center space-y-3 sm:space-y-4">
            <p className="text-gray-700 font-medium text-sm sm:text-base">Möchten Sie uns kontaktieren?</p>
            <div className="flex gap-2 sm:gap-3 justify-center">
              <button 
                className="px-4 py-2 sm:px-6 sm:py-3 bg-ink-deep hover:bg-highlight text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg text-sm sm:text-base"
                onClick={() => setContactStep(2)}
              >
                Ja
              </button>
              <button 
                className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors duration-200 font-semibold text-sm sm:text-base"
                onClick={() => setContactStep(0)}
              >
                Nein
              </button>
            </div>
          </div>
        )}

        {contactStep === 2 && (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-gray-700 font-medium text-center mb-3 sm:mb-4 text-sm sm:text-base">Worum geht es in Ihrer Anfrage?</p>
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              <button
                className="p-3 sm:p-4 bg-ink-deep hover:bg-highlight text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg text-left text-sm sm:text-base"
                onClick={() => {
                  setContactReason("Produktberatung und Empfehlungen")
                  setContactStep(3)
                }}
              >
                Produktberatung und Empfehlungen
              </button>
              <button
                className="p-3 sm:p-4 bg-ink-deep hover:bg-highlight text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg text-left text-sm sm:text-base"
                onClick={() => {
                  setContactReason("Großhandel und Mengenrabatte")
                  setContactStep(3)
                }}
              >
                Großhandel und Mengenrabatte
              </button>
              <button
                className="p-3 sm:p-4 bg-ink-deep hover:bg-highlight text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg text-left text-sm sm:text-base"
                onClick={() => {
                  setContactReason("Maßanfertigung & Gravur")
                  setContactStep(3)
                }}
              >
                Maßanfertigung & Gravur
              </button>
              <button
                className="p-3 sm:p-4 bg-ink-deep hover:bg-highlight text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg text-left text-sm sm:text-base"
                onClick={() => {
                  setContactReason("Allgemeine Fragen")
                  setContactStep(3)
                }}
              >
                Allgemeine Fragen
              </button>
            </div>
          </div>
        )}

        {contactStep === 3 && (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-gray-700 font-medium text-center text-sm sm:text-base">Wie ist Ihr Name?</p>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Ihr vollständiger Name"
              className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-lg focus:border-highlight focus:outline-none transition-colors duration-200 text-sm sm:text-base"
            />
            <button
              className="w-full py-2.5 sm:py-3 bg-ink-deep hover:bg-highlight text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              onClick={() => {
                if (contactName.trim()) setContactStep(4)
              }}
              disabled={!contactName.trim()}
            >
              Weiter
            </button>
          </div>
        )}

        {contactStep === 4 && (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-gray-700 font-medium text-center text-sm sm:text-base">Ihre E-Mail-Adresse:</p>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="ihre.email@beispiel.ch"
              className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-lg focus:border-highlight focus:outline-none transition-colors duration-200 text-sm sm:text-base"
            />
            <button
              className="w-full py-2.5 sm:py-3 bg-ink-deep hover:bg-highlight text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              onClick={() => {
                if (contactEmail.trim() && contactEmail.includes('@')) setContactStep(5)
              }}
              disabled={!contactEmail.trim() || !contactEmail.includes('@')}
            >
              Weiter
            </button>
          </div>
        )}

        {contactStep === 5 && (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-gray-700 font-medium text-center text-sm sm:text-base">Ihre Nachricht:</p>
            <textarea
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Beschreiben Sie Ihre Anfrage detailliert..."
              rows={3}
              className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-lg focus:border-highlight focus:outline-none transition-colors duration-200 resize-none text-sm sm:text-base"
            />
            <button
              className="w-full py-2.5 sm:py-3 bg-ink-deep hover:bg-highlight text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              onClick={() => {
                if (contactMessage.trim()) setContactStep(6)
              }}
              disabled={!contactMessage.trim()}
            >
              Weiter
            </button>
          </div>
        )}

        {contactStep === 6 && (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-gray-700 font-medium text-center mb-3 sm:mb-4 text-sm sm:text-base">Überprüfen Sie Ihre Angaben:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-gray-700 text-xs sm:text-sm">Betreff:</span>
                <span className="text-gray-600 text-right text-xs sm:text-sm max-w-[60%]">{contactReason}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700 text-xs sm:text-sm">Name:</span>
                <span className="text-gray-600 text-xs sm:text-sm">{contactName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700 text-xs sm:text-sm">E-Mail:</span>
                <span className="text-gray-600 text-xs sm:text-sm">{contactEmail}</span>
              </div>
              <div className="border-t pt-2 sm:pt-3">
                <span className="font-semibold text-gray-700 text-xs sm:text-sm">Nachricht:</span>
                <p className="text-gray-600 mt-1 text-xs sm:text-sm">{contactMessage}</p>
              </div>
            </div>
            <button 
              onClick={sendContactRequest}
              className="w-full py-3 sm:py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 font-bold shadow-md hover:shadow-lg text-sm sm:text-lg"
            >
              WhatsApp Nachricht senden
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Botón flotante para abrir chat - Responsivo */}
      {!isOpen && showChatButton && (
        <button 
          onClick={() => setIsOpen(true)} 
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] group transition-all duration-500 ${
            showChatButton ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
          }`}
        >
          {/* Glow effect background */}
          <div className="absolute inset-0 bg-highlight rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-all duration-300 scale-110"></div>
          
          {/* Main button - Más pequeño en móvil */}
          <div className="relative bg-ink-deep rounded-full p-3 sm:p-4 shadow-xl border border-highlight/30 group-hover:scale-105 transition-all duration-300">
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full"></div>
            
            {/* Icon - Tamaño adaptativo */}
            <div className="relative">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-lg" />
            </div>
          </div>
          
          {/* Tooltip - Oculto en móvil para ahorrar espacio */}
          <div className="hidden sm:block absolute -top-14 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap backdrop-blur-sm">
            Berater öffnen
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black/80 rotate-45 -mt-1"></div>
          </div>
        </button>
      )}

      {/* Ventana del chat - Responsiva para pantallas pequeñas */}
      <div className={`fixed bottom-2 right-2 left-2 sm:bottom-6 sm:right-6 sm:left-auto z-[9998] sm:w-96 h-[calc(100vh-100px)] sm:h-[600px] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 transition-all duration-500 ${
        isOpen 
          ? 'translate-y-0 opacity-100 scale-100' 
          : 'translate-y-8 opacity-0 scale-95 pointer-events-none'
      }`}>
        {/* Header del chat - Más compacto en móvil */}
        <div className="bg-ink-deep rounded-t-2xl p-3 sm:p-4 flex items-center justify-between">
          <h2 className="flex items-center gap-1 sm:gap-2 text-white font-bold text-base sm:text-lg">
            <span className="hidden xs:inline">GLUTWERK Berater</span>
            <span className="xs:hidden">Berater</span>
          </h2>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-white hover:bg-white/20 rounded-lg p-1.5 sm:p-2 transition-colors duration-200" 
            aria-label="Chat schließen"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {contactStep > 0 ? (
          <div className="h-[calc(100%-60px)] sm:h-[calc(100%-80px)] overflow-y-auto">
            {renderContactFlow()}
          </div>
        ) : (
          <>
            {/* Área de mensajes con productos detectados - Responsiva */}
            <div className="h-[calc(100%-120px)] sm:h-[calc(100%-140px)] overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
              {messages.length === 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  <p className="text-center text-gray-600 font-medium mb-4 sm:mb-6 text-base sm:text-lg">Wie kann ich Ihnen bei der Wahl Ihres perfekten Lederprodukts helfen?</p>
                  <div className="space-y-2 sm:space-y-2">
                    {visibleQuestions.map((question, index) => (
                      <button
                        key={index}
                        className="w-full text-left p-3 sm:p-3 bg-canvas hover:bg-n-150 border border-n-150 rounded-lg transition-all duration-200 text-sm sm:text-base text-gray-700 hover:text-ink-deep shadow-sm hover:shadow-md"
                        onClick={() => handleQuestionClick(question)}
                        disabled={isLoading}
                      >
                        <span className="line-clamp-2">{question}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 sm:p-4 ${
                        msg.role === "user" 
                          ? "bg-ink-deep text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <div className={`text-sm font-medium mb-2 ${
                        msg.role === "user" ? "text-white/70" : "text-highlight"
                      }`}>
                        {msg.role === "user" ? "Sie" : "GLUTWERK Berater"}
                      </div>
                      
                      {/* Contenido del mensaje */}
                      {msg.role === "assistant" ? (
                        <div className="space-y-2">
                          <div
                            className="prose prose-sm sm:prose-base max-w-none"
                            dangerouslySetInnerHTML={{ __html: msg.content }}
                          />
                          {/* Productos detectados */}
                          {msg.detectedProducts && msg.detectedProducts.length > 0 && (
                            <DetectedProductsDisplay 
                              products={msg.detectedProducts} 
                              onCloseChat={() => setIsOpen(false)}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="text-sm sm:text-base leading-relaxed">{msg.content}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Área de entrada de mensajes - Más compacta en móvil */}
            <div className="p-3 sm:p-4 border-t border-gray-200 bg-white rounded-b-2xl">
              <div className="flex items-end gap-1.5 sm:gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    name="message"
                    value={input}
                    onChange={autoResizeTextarea}
                    className="w-full p-3 sm:p-3 border-2 border-gray-300 rounded-xl focus:border-highlight focus:outline-none resize-none transition-colors duration-200 text-sm sm:text-base"
                    placeholder="Ihre Frage zu unseren Produkten..."
                    disabled={isLoading}
                    rows={1}
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage(input)
                      }
                    }}
                  />
                </div>
                <button
                  onClick={() => sendMessage(input)}
                  className={`p-3 sm:p-3 rounded-xl transition-all duration-200 ${
                    !input.trim() && !isLoading
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-ink-deep hover:bg-highlight text-white shadow-md hover:shadow-lg"
                  }`}
                  disabled={!input.trim() || isLoading}
                  aria-label="Senden"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <SendHorizontal className="w-5 h-5 sm:w-5 sm:h-5" />
                  )}
                </button>
                {showClearIcon && (
                  <button 
                    onClick={clearChat} 
                    className="p-3 sm:p-3 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-xl transition-colors duration-200" 
                    aria-label="Chat löschen"
                  >
                    <Trash2 className="w-5 h-5 sm:w-5 sm:h-5" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Estilos para animaciones y efectos visuales */}
      <style jsx global>{`
        /* Breakpoint personalizado para pantallas extra pequeñas */
        @media (min-width: 475px) {
          .xs\\:inline {
            display: inline;
          }
          .xs\\:hidden {
            display: none;
          }
        }
        
        @media (max-width: 474px) {
          .xs\\:inline {
            display: none;
          }
          .xs\\:hidden {
            display: inline;
          }
        }
        
        /* Ajustes específicos para móviles */
        @media (max-width: 640px) {
          /* Asegurar que el chat no se salga de la pantalla */
          .chat-mobile-fix {
            max-width: calc(100vw - 16px);
            max-height: calc(100vh - 100px);
          }
          
          /* Hacer el texto más legible en pantallas pequeñas */
          .prose-sm {
            font-size: 0.875rem;
            line-height: 1.5;
          }
          
          .prose-sm p {
            margin-bottom: 0.75rem;
          }
          
          .prose-sm ul, .prose-sm ol {
            margin-left: 1.25rem;
            margin-bottom: 0.75rem;
          }
          
          .prose-sm li {
            margin-bottom: 0.375rem;
          }
          
          /* Optimizar productos detectados para móvil */
          .mobile-product-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          
          .mobile-product-card {
            min-width: calc(50% - 0.25rem);
            max-width: calc(50% - 0.25rem);
          }
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
        
        .prose h1, .prose h2, .prose h3 {
          color: #dc2626;
          font-weight: 600;
        }
        
        .prose p {
          color: #374151;
          line-height: 1.6;
        }
        
        .prose ul, .prose ol {
          color: #374151;
        }
        
        .prose strong {
          color: #dc2626;
          font-weight: 600;
        }
        
        .prose a {
          color: #ea580c;
          text-decoration: underline;
        }
        
        .prose a:hover {
          color: #dc2626;
        }
        
        /* Efectos de highlight para navegación desde el chat */
        .highlight-section {
          animation: highlight-pulse 2s ease-in-out;
          position: relative;
        }
        
        .highlight-section::before {
          content: '';
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          background: linear-gradient(45deg, #ef4444, #f97316, #ef4444);
          background-size: 300% 300%;
          border-radius: 20px;
          z-index: -1;
          opacity: 0.3;
          animation: highlight-glow 2s ease-in-out;
        }
        
        .highlight-product {
          animation: highlight-product-pulse 3s ease-in-out;
          transform: scale(1.05);
          box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4);
          border: 2px solid #f97316 !important;
        }
        
        @keyframes highlight-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }
        
        @keyframes highlight-glow {
          0%, 100% {
            background-position: 0% 50%;
            opacity: 0.3;
          }
          50% {
            background-position: 100% 50%;
            opacity: 0.6;
          }
        }
        
        @keyframes highlight-product-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          25%, 75% {
            transform: scale(1.05);
            box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 15px 40px rgba(239, 68, 68, 0.6);
          }
        }
        
        /* Mejora visual para elementos clickeables en el chat */
        .chat-product-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .chat-product-card:active {
          transform: scale(0.95);
        }
        
        .chat-product-card:hover {
          box-shadow: 0 8px 25px rgba(239, 68, 68, 0.15);
        }
        
        /* Evitar zoom en inputs en iOS */
        @media screen and (max-width: 640px) {
          input[type="text"],
          input[type="email"],
          textarea {
            font-size: 16px !important;
          }
        }
      `}</style>
    </>
  )
}