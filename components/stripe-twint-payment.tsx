"use client"

import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, useStripe } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface StripeTwintPaymentProps {
  amount: number
  orderData: any
  publishableKey?: string
  secretKey?: string
  pmcId?: string
  disabled?: boolean
  returnUrl: string
  onSaveOrder: () => Promise<string>  // saves order to DB, returns orderNumber
  onError: (msg: string) => void
}

const TwintForm = ({ amount, orderData, secretKey, pmcId, disabled, returnUrl, onSaveOrder, onError }: StripeTwintPaymentProps) => {
  const stripe = useStripe()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

  const handlePay = async () => {
    if (!stripe || disabled) return
    setIsProcessing(true)
    setError("")

    try {
      // 1. Guardar pedido en DB primero
      const orderNumber = await onSaveOrder()

      // 2. Crear Payment Intent con método TWINT
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency: 'chf',
          orderData: { ...orderData, orderId: orderNumber },
          stripeSecretKey: secretKey,
          paymentMethodConfigId: pmcId || undefined,
          paymentMethodTypes: pmcId ? undefined : ['twint'],
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Fehler beim Erstellen der Zahlung')
      }

      const { clientSecret } = await res.json()

      // 3. Stripe muestra QR code (desktop) o redirige a la app TWINT (mobile)
      //    return_url incluye el orderNumber para recuperar el pedido al volver
      const finalReturnUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}twint_order=${orderNumber}&twint_total=${amount}`

      // Marcar carrito para limpiar cuando la página recargue tras el redirect
      localStorage.setItem("cart-should-be-cleared", "true")

      const { error: stripeError } = await stripe.confirmTwintPayment(clientSecret, {
        payment_method: {
          billing_details: {
            name: `${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}`,
            email: orderData.customerInfo.email,
          },
        },
        return_url: finalReturnUrl,
      })

      if (stripeError) {
        setError(stripeError.message || 'TWINT Zahlung fehlgeschlagen')
        onError(stripeError.message || 'TWINT Zahlung fehlgeschlagen')
      }
      // Si no hay error, Stripe redirige al usuario — no hace falta más código aquí
    } catch (err: any) {
      const msg = err.message || 'Unbekannter Fehler'
      setError(msg)
      onError(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 space-y-1">
        <p className="font-semibold text-gray-800">Wie funktioniert es?</p>
        <p>📱 <strong>Mobile:</strong> Sie werden direkt zur TWINT-App weitergeleitet</p>
        <p>🖥️ <strong>Desktop:</strong> Ein QR-Code erscheint zum Scannen mit der App</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button
        onClick={handlePay}
        disabled={!stripe || isProcessing || disabled}
        className="w-full min-h-14 h-auto py-3 text-base font-bold bg-black hover:bg-neutral-800 text-white shadow-xl transition-all duration-300"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Weiterleitung zu TWINT...
          </>
        ) : (
          <>Via TWINT bezahlen · {amount.toFixed(2)} CHF</>
        )}
      </Button>
    </div>
  )
}

export function StripeTwintPayment(props: StripeTwintPaymentProps) {
  const key = props.publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
      Stripe-Schlüssel nicht konfiguriert
    </div>
  )

  const stripePromise = loadStripe(key)
  return (
    <Elements stripe={stripePromise}>
      <TwintForm {...props} />
    </Elements>
  )
}
