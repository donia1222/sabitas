import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20'
  })
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`🔔 Received webhook: ${event.type}`)

  // Manejar los eventos
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log('✅ Payment succeeded:', {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convertir de centavos
        currency: paymentIntent.currency,
        customer_email: paymentIntent.receipt_email,
        metadata: paymentIntent.metadata
      })

      // OPCIONAL: Aquí puedes hacer una llamada a tu PHP backend para actualizar el estado
      // if (paymentIntent.metadata.orderId) {
      //   try {
      //     await fetch('${process.env.NEXT_PUBLIC_API_BASE_URL}/update_order_status.php', {
      //       method: 'POST',
      //       headers: { 'Content-Type': 'application/json' },
      //       body: JSON.stringify({
      //         orderId: paymentIntent.metadata.orderId,
      //         status: 'paid',
      //         stripePaymentId: paymentIntent.id
      //       })
      //     })
      //   } catch (error) {
      //     console.error('Error updating order in PHP:', error)
      //   }
      // }
      break

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent
      console.log('❌ Payment failed:', {
        id: failedPayment.id,
        amount: failedPayment.amount / 100,
        currency: failedPayment.currency,
        last_payment_error: failedPayment.last_payment_error,
        metadata: failedPayment.metadata
      })

      // OPCIONAL: Marcar el pedido como fallido en tu base de datos
      break

    case 'payment_intent.canceled':
      const canceledPayment = event.data.object as Stripe.PaymentIntent
      console.log('🚫 Payment canceled:', canceledPayment.id)
      break

    default:
      console.log(`🔔 Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}