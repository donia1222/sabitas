"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, ArrowLeft, Package, Mail, Database, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface OrderData {
  payerID: string
  customerInfo: any
  cart: any[]
  total: number
  timestamp: string
}

export default function PayPalSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [payerID, setPayerID] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)
  const [emailSent, setEmailSent] = useState(false)
  const [orderSaved, setOrderSaved] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string>("")
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [hasProcessed, setHasProcessed] = useState<boolean>(false)

  // API Base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

  useEffect(() => {
    // Prevenir múltiples ejecuciones
    if (hasProcessed) return
    
    const payerIdFromUrl = searchParams.get("PayerID")
    if (payerIdFromUrl) {
      setPayerID(payerIdFromUrl)
      setHasProcessed(true)
      processPayPalSuccess(payerIdFromUrl)
    } else {
      setError("No se encontró PayerID en la URL")
      setIsProcessing(false)
    }
  }, [searchParams, hasProcessed])

  const processPayPalSuccess = async (payerIdFromUrl: string) => {
    try {
      // Intentar obtener datos del pedido usando múltiples métodos
      let savedCustomerInfo = localStorage.getItem("cantina-customer-info")
      let savedCart = localStorage.getItem("cantina-cart")
      
      // Si no están en localStorage, intentar sessionStorage
      if (!savedCustomerInfo || !savedCart) {
        savedCustomerInfo = sessionStorage.getItem("cantina-customer-info")
        savedCart = sessionStorage.getItem("cantina-cart")
      }
      
      // Intentar recuperar por ID de pedido único
      if (!savedCustomerInfo || !savedCart) {
        const orderId = localStorage.getItem("cantina-current-order-id") || sessionStorage.getItem("cantina-current-order-id")
        
        if (orderId) {
          const orderData = localStorage.getItem(`cantina-order-${orderId}`) || sessionStorage.getItem(`cantina-order-${orderId}`)
          
          if (orderData) {
            const parsedOrderData = JSON.parse(orderData)
            savedCustomerInfo = JSON.stringify(parsedOrderData.customerInfo)
            savedCart = JSON.stringify(parsedOrderData.cart)
          }
        }
      }
      
      // Intentar recuperar del parámetro custom de PayPal
      if (!savedCustomerInfo || !savedCart) {
        const customParam = searchParams.get("custom")
        
        if (customParam) {
          const orderData = localStorage.getItem(`cantina-order-${customParam}`) || sessionStorage.getItem(`cantina-order-${customParam}`)
          
          if (orderData) {
            const parsedOrderData = JSON.parse(orderData)
            savedCustomerInfo = JSON.stringify(parsedOrderData.customerInfo)
            savedCart = JSON.stringify(parsedOrderData.cart)
          }
        }
      }

      if (!savedCustomerInfo || !savedCart) {
        throw new Error("No se encontraron datos del pedido en localStorage ni sessionStorage")
      }

      const customerInfo = JSON.parse(savedCustomerInfo)
      const cart = JSON.parse(savedCart)

      // Calcular total
      const total = cart.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)

      const orderData: OrderData = {
        payerID: payerIdFromUrl,
        customerInfo,
        cart,
        total,
        timestamp: new Date().toISOString(),
      }

      setDebugInfo("Procesando pago exitoso de PayPal...")

      // 1. PRIMERO: Guardar pedido en la base de datos
      await saveOrderToDatabase(orderData)

      // 2. SEGUNDO: Enviar email de confirmación
      await sendOrderEmail(orderData)

      // 3. PRIMERO: Marcar para limpieza y comunicar con la página principal
      localStorage.setItem('cart-should-be-cleared', 'true')
      
      // Forzar limpieza del carrito usando eventos del navegador
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'cart-should-be-cleared',
        newValue: 'true'
      }))
      
      // Forzar evento personalizado adicional para mayor compatibilidad
      window.dispatchEvent(new CustomEvent('paypal-cart-clear', { 
        detail: { timestamp: Date.now() } 
      }))
      
      // Usar postMessage para comunicación entre pestañas/ventanas
      if (window.opener) {
        window.opener.postMessage({ type: 'CLEAR_CART', source: 'paypal-success' }, '*')
      }
      
      // DESPUÉS: Limpiar localStorage y sessionStorage con delay para asegurar comunicación
      setTimeout(() => {
        localStorage.removeItem("cantina-cart")
        sessionStorage.removeItem("cantina-cart")
        localStorage.removeItem("cantina-customer-info")
        sessionStorage.removeItem("cantina-customer-info")
      }, 1000)
      
      // Limpiar datos temporales del pedido
      const orderId = localStorage.getItem("cantina-current-order-id") || sessionStorage.getItem("cantina-current-order-id")
      const customParam = searchParams.get("custom")
      
      if (orderId) {
        localStorage.removeItem(`cantina-order-${orderId}`)
        sessionStorage.removeItem(`cantina-order-${orderId}`)
        localStorage.removeItem("cantina-current-order-id")
        sessionStorage.removeItem("cantina-current-order-id")
      }
      
      if (customParam && customParam !== orderId) {
        localStorage.removeItem(`cantina-order-${customParam}`)
        sessionStorage.removeItem(`cantina-order-${customParam}`)
      }

      // 4. Guardar información del pago exitoso
      const paymentInfo = {
        payerID: payerIdFromUrl,
        orderNumber: orderNumber,
        timestamp: new Date().toISOString(),
        status: "completed",
      }
      localStorage.setItem("last-payment", JSON.stringify(paymentInfo))
    } catch (error: any) {
      console.error("Error procesando pago:", error)
      setError(error.message)
      setDebugInfo(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const saveOrderToDatabase = async (orderData: OrderData) => {
    try {
      setDebugInfo("Guardando pedido en la base de datos...")

      // Preparar datos para la base de datos
      const dbOrderData = {
        customerInfo: orderData.customerInfo,
        cart: orderData.cart,
        totalAmount: orderData.total,
        shippingCost: 0,
        paymentMethod: "paypal",
        paymentStatus: "completed",
        paypalPayerID: orderData.payerID,
        notes: `PayPal Payment - Payer ID: ${orderData.payerID}`,
      }

      console.log("Enviando pedido a la base de datos:", dbOrderData)

      const response = await fetch(`${API_BASE_URL}/add_order.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dbOrderData),
      })

      console.log("Response status:", response.status)

      const responseText = await response.text()
      console.log("Raw response:", responseText)

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${responseText}`)
      }

      if (!result.success) {
        throw new Error(result.error || "Error saving order to database")
      }

      setOrderSaved(true)
      setOrderNumber(result.orderNumber)
      setDebugInfo(`✅ Pedido guardado exitosamente: ${result.orderNumber}`)

      console.log("✅ Pedido guardado en base de datos:", result)
      return result
    } catch (error: any) {
      console.error("❌ Error guardando pedido:", error)
      setDebugInfo(`❌ Error guardando pedido: ${error.message}`)
      throw error
    }
  }

  const sendOrderEmail = async (orderData: OrderData) => {
    try {
      setDebugInfo((prev) => prev + "\n\nEnviando email de confirmación...")
      console.log("Enviando datos del pedido para email:", orderData)

      // Agregar número de pedido al email
      const emailData = {
        ...orderData,
        orderNumber: orderNumber,
        orderSaved: true,
      }

      const response = await fetch(`${API_BASE_URL}/enviar_confirmacion.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      })

      console.log("Email response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log("Email result:", result)

      if (result.success) {
        setEmailSent(true)
        setDebugInfo((prev) => prev + "\n✅ Email enviado correctamente")
        console.log("✅ Email enviado correctamente")
      } else {
        console.error("❌ Error enviando email:", result.error)
        setDebugInfo((prev) => prev + `\n❌ Error enviando email: ${result.error}`)
        setEmailSent(false)
      }
    } catch (error: any) {
      console.error("❌ Error conectando con servidor de email:", error)
      setDebugInfo((prev) => prev + `\n❌ Error enviando email: ${error.message}`)
      setEmailSent(false)

      // Guardar datos para reintento manual
      localStorage.setItem("pending-email", JSON.stringify(orderData))
    }
  }

  const goBackToStore = () => {
    router.push("/")
  }

  const retryProcess = () => {
    setIsProcessing(true)
    setError("")
    setDebugInfo("")
    const payerIdFromUrl = searchParams.get("PayerID")
    if (payerIdFromUrl) {
      processPayPalSuccess(payerIdFromUrl)
    }
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="text-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600 mb-4">Procesando su pago y guardando pedido...</p>

            {debugInfo && (
              <div className="bg-blue-50 rounded-lg p-4 mt-4 text-left">
                <h4 className="font-semibold text-blue-700 mb-2">Proceso:</h4>
                <pre className="text-xs text-blue-600 whitespace-pre-wrap">{debugInfo}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="text-center p-12">
            <AlertCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-red-700 mb-4">Error procesando pago</h1>
            <p className="text-xl text-gray-600 mb-6">Hubo un problema procesando su pedido.</p>

            <div className="bg-red-50 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-semibold text-red-700 mb-2">Error:</h4>
              <p className="text-red-600">{error}</p>

              {debugInfo && (
                <>
                  <h4 className="font-semibold text-red-700 mb-2 mt-4">Debug Info:</h4>
                  <pre className="text-xs text-red-600 whitespace-pre-wrap">{debugInfo}</pre>
                </>
              )}
            </div>

            <div className="space-y-4">
              <Button onClick={retryProcess} className="bg-red-600 hover:bg-red-700">
                Reintentar
              </Button>
              <Button onClick={goBackToStore} variant="outline">
                Volver al Shop
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="text-center p-12">
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-green-700 mb-4">¡Bestellung erfolgreich!</h1>
          <p className="text-xl text-gray-600 mb-6">Vielen Dank! Ihr PayPal-Zahlung wurde erfolgreich verarbeitet.</p>

          {payerID && (
            <div className="bg-green-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-green-700 mb-2">Zahlungsdetails</h3>
              <p className="text-green-600">PayPal Payer ID: {payerID}</p>
              {orderNumber && <p className="text-green-600">Bestellnummer: {orderNumber}</p>}
              <p className="text-green-600">Status: Bezahlt ✅</p>
              <p className="text-green-600">Datum: {new Date().toLocaleDateString("de-CH")}</p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Database className="w-4 h-4" />
                  <span className="text-sm">
                    {orderSaved ? (
                      <span className="text-green-700">✅ Pedido guardado en base de datos</span>
                    ) : (
                      <span className="text-orange-600">⚠️ Guardando pedido...</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">
                    {emailSent ? (
                      <span className="text-green-700">✅ Bestätigungs-E-Mail gesendet</span>
                    ) : (
                      <span className="text-orange-600">⚠️ E-Mail wird verarbeitet...</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {debugInfo && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-semibold text-blue-700 mb-2">Proceso completado:</h4>
              <pre className="text-xs text-blue-600 whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-700 mb-4">
              <Package className="w-5 h-5" />
              <span>Ihr Warenkorb wurde geleert</span>
            </div>

            <p className="text-gray-600">Sie erhalten eine Bestätigungs-E-Mail von uns und von PayPal.</p>
            <p className="text-gray-600">Ihre Bestellung wird in 2-3 Werktagen versendet.</p>

            <Button onClick={goBackToStore} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 text-lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zum Shop
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
