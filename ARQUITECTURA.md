> **Aviso (06/10/2026).** Este documento describe la tienda **original**
> (caza y pesca / barbacoas), no el proyecto actual. Se conserva porque la
> parte tecnica —estructura, API, tablas— sigue siendo valida, pero hay cosas
> desfasadas: por ejemplo la ruta del panel aqui es `/adminsevelen` y la real
> es `/adminpanel`. Para saber que se esta construyendo ahora, lee `CLAUDE.md`.

# Hunting, Fishing & Accessories Store — Complete Technical Documentation

> Full e-commerce platform for a hunting, fishing and outdoor accessories store. Features admin dashboard, CMS, AI chatbot, multiple payment methods and PHP backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [Pages & Routes](#pages--routes)
5. [Components](#components)
6. [Next.js API Routes](#nextjs-api-routes)
7. [PHP Backend](#php-backend)
8. [Database](#database)
9. [Hooks & Utilities](#hooks--utilities)
10. [External Integrations](#external-integrations)
11. [State Management](#state-management)
12. [Main Flows](#main-flows)
13. [Admin Dashboard](#admin-dashboard)
14. [Payment System](#payment-system)
15. [Configuration & Environment Variables](#configuration--environment-variables)
16. [Estimated Price for Switzerland](#estimated-price-for-switzerland)
17. [Client Summary](#client-summary)

---

## Overview

A fully custom-built e-commerce store for hunting, fishing and outdoor accessories. The architecture combines:

- **Frontend**: Next.js 15 (App Router) + React 19
- **Middleware/API**: Next.js API Routes as proxy/cache layer
- **Backend**: PHP + MySQL on external server (`web.lweb.ch/shop`)
- **AI**: OpenAI GPT-4o-mini for customer support chatbot
- **Payments**: Stripe (card + Swiss TWINT) + PayPal + Invoice

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js App Router | 15.2.4 |
| UI Library | React | 19 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS + shadcn/ui | Latest |
| Base Components | Radix UI | Latest |
| Backend | PHP + MySQL | — |
| AI | OpenAI API (GPT-4o-mini) | — |
| Payments | Stripe + PayPal | — |
| Analytics | Vercel Analytics | — |
| Forms | React Hook Form + Zod | — |
| Notifications | Sonner (toast) | — |
| Icons | lucide-react | — |
| Excel | xlsx | — |
| PDF | jsPDF | — |
| Markdown | marked + DOMPurify | — |
| Charts | recharts | — |
| Deployment | Vercel (frontend) | — |

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                  │
│  React 19 + Next.js 15 App Router + Tailwind CSS    │
│  State: React hooks + localStorage                   │
└──────────────┬──────────────────────────────────────┘
               │ HTTP / RSC
┌──────────────▼──────────────────────────────────────┐
│           NEXT.JS API ROUTES (/app/api/)             │
│  - Cache (30s TTL for products)                     │
│  - Proxy to PHP backend                             │
│  - Stripe PaymentIntents                            │
│  - OpenAI chat completions                          │
│  - Stripe Webhooks                                  │
└──────┬─────────────────────────┬────────────────────┘
       │ PHP REST API             │ External services
┌──────▼───────────────┐  ┌──────▼────────────────────┐
│  PHP + MySQL Backend  │  │  - OpenAI API             │
│  web.lweb.ch/shop     │  │  - Stripe API             │
│  - Products           │  │  - PayPal API             │
│  - Orders             │  │  - Vercel Analytics       │
│  - Users              │  └───────────────────────────┘
│  - Blog / Gallery     │
│  - Announcements      │
│  - Email (SMTP)       │
└──────────────────────┘
```

---

## Pages & Routes

### `/` — Home (`app/page.tsx`)
- Hero section with premium banner and CTAs
- Product category previews
- Recommended products grid
- Customer reviews section
- Blog banner (latest featured post)
- Gallery banner
- Shopping cart (side drawer)
- Floating AI chatbot

### `/shop` — Shop (`app/shop/page.tsx`)
- Full product grid
- Category filtering
- Sorting (price, name, popularity)
- Pagination
- Stock indicators

### `/product/[id]` — Product Detail (`app/product/[id]/page.tsx`)
- Multiple images with lightbox and zoom
- Full description, price, origin, category
- Add to cart button
- Stock indicator
- Similar products section

### `/gallery` — Gallery (`app/gallery/page.tsx`)
- Image grid with custom titles
- Lightbox with keyboard navigation
- Responsive column layout

### `/blog` — Blog (`app/blog/page.tsx`)
- Featured hero article
- Additional articles grid
- Full-read modal with image lightbox
- Supports hero image + 3 additional images per post
- Markdown content rendered and sanitized (DOMPurify)

### `/profile` — User Profile (`app/profile/page.tsx`)
- Account management (name, email, phone)
- Shipping address management
- Order history
- Password change

### `/adminsevelen` — Admin Panel (`app/adminsevelen/page.tsx`)
- 7-day session-based authentication
- Full management dashboard

### `/success` — Payment Success (`app/success/page.tsx`)
- Processes PayPal return
- Saves order to PHP database
- Sends confirmation email
- Clears cart via localStorage flag

### `/cancel` — Payment Cancelled (`app/cancel/page.tsx`)
- Shows PayPal payment cancellation notice

---

## Components

### Navigation & Layout
| Component | File | Purpose |
|-----------|------|---------|
| Header | `header.tsx` | Navbar with logo, category menu, search, cart, auth, profile link |
| Footer | `footer.tsx` | Footer with company info, links, contact |
| ThemeProvider | `theme-provider.tsx` | Dark mode support |
| CookieBanner | `cookie-banner.tsx` | GDPR cookie consent notice |
| FadeSection | `fade-section.tsx` | Scroll-triggered fade-in animation wrapper |
| Loading | `loading.tsx` | Loading state component |

### Home Page
| Component | File | Purpose |
|-----------|------|---------|
| HeroSection | `hero-section.tsx` | Main banner with CTA |
| CategoryPreviewSection | `category-preview-section.tsx` | Featured category previews |
| RecommendedProducts | `recommended-products.tsx` | Recommended products grid |
| ReviewsSection | `reviews-section.tsx` | Customer testimonials |
| BlogBanner | `blog-banner.tsx` | Latest blog post preview |
| GalleryBanner | `gallery-banner.tsx` | Gallery preview |

### Shop & Products
| Component | File | Purpose |
|-----------|------|---------|
| ShopGrid | `shop-grid.tsx` | Main shop grid with filters, sorting, pagination |
| ProductsGrid | `products-grid.tsx` | Reusable product grid |
| ProductImage | `product-image.tsx` | Smart product image loading with fallback candidates |

### Cart & Checkout
| Component | File | Purpose |
|-----------|------|---------|
| ShoppingCart | `shopping-cart.tsx` | Side drawer with cart items, totals, add/remove |
| CheckoutPage | `checkout-page.tsx` | Full checkout flow: customer data, shipping, payment method |
| StripePayment | `stripe-payment.tsx` | Stripe card payment form |
| StripeTwintPayment | `stripe-twint-payment.tsx` | Combined Stripe + TWINT component |

### Auth & Users
| Component | File | Purpose |
|-----------|------|---------|
| AdminAuth | `admin-auth.tsx` | Admin login modal |
| LoginAuth | `login-auth.tsx` | User login component |
| Login | `login.tsx` | Login form |
| UserProfile | `user-profile.tsx` | Profile management: account, address, orders, password |

### Admin
| Component | File | Purpose |
|-----------|------|---------|
| Admin | `admin.tsx` | Admin dashboard with tabs: products, orders, categories, blog, gallery, announcements, payments, shipping, users, import/export |

### AI
| Component | File | Purpose |
|-----------|------|---------|
| Bot | `bot.tsx` | Floating OpenAI GPT-4o-mini chatbot — detects mentioned products and shows a carousel |

---

## Next.js API Routes

### Products
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/products` | GET | List products with 30s cache. Supports `?id=X` for single product |
| `/api/add-products` | POST | Bulk product import from Excel |
| `/api/import-products` | POST | Product import with image upload |
| `/api/delete-import` | POST | Remove imported products |

### Categories
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/categories` | GET | List all categories |
| `/api/categories/add` | POST | Create new category |
| `/api/categories/edit` | POST | Update category |
| `/api/categories/delete` | POST | Delete category |

### Orders
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/orders/update` | POST | Update order status |
| `/api/orders/ship` | POST | Mark order as shipped |

### Blog
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/blog` | GET | Fetch blog posts with cache |
| `/api/blog/add` | POST | Create blog post |
| `/api/blog/edit` | POST | Update blog post |

### Gallery
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/gallery` | GET | Fetch gallery images with cache |
| `/api/gallery/add` | POST | Upload gallery image |
| `/api/gallery/delete` | POST | Delete gallery image |

### Announcements
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/announcement` | GET | Fetch active announcement |
| `/api/announcement/save` | POST | Save/update announcement |

### Payments
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/stripe/create-payment-intent` | POST | Create Stripe PaymentIntent for checkout |
| `/api/stripe/webhook` | POST | Handle Stripe webhooks (completed/failed payments) |

### AI
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | OpenAI chat completions for the chatbot |

---

## PHP Backend

Location: `web.lweb.ch/shop` — files in `/api/` directory

### Products
| File | Purpose |
|------|---------|
| `get_products.php` | List products with filters, images, pagination |
| `add_product.php` | Create product with image upload |
| `edit_product.php` | Update product details |
| `import_products.php` | Bulk import from Excel with image download |
| `delete_import.php` | Remove imported products |

### Orders
| File | Purpose |
|------|---------|
| `add_order.php` | Create order record from checkout |
| `get_orders.php` | Fetch orders for admin dashboard with stats |
| `get_ordersuser.php` | User-specific orders |
| `update_order.php` | Update order status |
| `send_shipping_notification.php` | Send shipping notification email |
| `email_functions.php` | Shared email utilities |

### Categories
| File | Purpose |
|------|---------|
| `get_categories.php` | List all categories |
| `add_category.php` | Create category |
| `edit_category.php` | Update category |
| `delete_category.php` | Delete category |

### Blog
| File | Purpose |
|------|---------|
| `get_blog_posts.php` | Fetch blog posts |
| `add_blog_post.php` | Create blog post |
| `edit_blog_post.php` | Update blog post |

### Gallery
| File | Purpose |
|------|---------|
| `get_gallery_images.php` | Fetch gallery images |
| `add_gallery_image.php` | Upload image with custom title |
| `delete_gallery_image.php` | Delete image |

### Users
| File | Purpose |
|------|---------|
| `create_user.php` | Register new user |
| `login_user.php` | User authentication |
| `get_user.php` | Fetch user profile |
| `update_user.php` | Update user data |
| `delete_user.php` | Delete user account |
| `change_password.php` | Change password |
| `reset_password.php` | Password reset |

### Settings & Configuration
| File | Purpose |
|------|---------|
| `config.php` | DB credentials, CORS, upload URL helpers |
| `get_payment_settings.php` | Fetch payment method settings |
| `save_payment_settings.php` | Save payment configuration |
| `get_shipping_settings.php` | Fetch shipping costs |
| `save_shipping_settings.php` | Update shipping costs |
| `calculate_shipping.php` | Calculate shipping cost per order |

### Announcements & Email
| File | Purpose |
|------|---------|
| `get_announcement.php` | Fetch active announcement/banner |
| `save_announcement.php` | Create/update announcement |
| `enviar_confirmacion.php` | Send order confirmation email |

---

## Database

**Type**: MySQL via PHP PDO
**Host**: `web.lweb.ch` (external shared server)

### Inferred Tables

```sql
products
  id, name, description, price, image, image2, image3, image4,
  rating, badge, origin, stock, category_id, created_at

categories
  id, name, slug

orders
  id, order_number, customer_name, customer_email, customer_phone,
  shipping_address, shipping_city, shipping_postal_code, shipping_canton,
  total_amount, shipping_cost, status, payment_method, payment_status, created_at

order_items
  id, order_id, product_id, product_name, quantity, price

users
  id, email, password_hash, first_name, last_name, phone,
  address, city, postal_code, canton, created_at

blog_posts
  id, title, content (Markdown), hero_image_url,
  image2_url, image3_url, image4_url, created_at

gallery_images
  id, title, image_url, created_at

announcements
  id, type, title, subtitle, image1_url, image2_url,
  product_url, is_active, show_once

payment_settings
  id, enable_paypal, enable_stripe, enable_twint, enable_invoice

shipping_settings
  id, cost_config (JSON with costs per zone/weight)
```

---

## Hooks & Utilities

### Hooks (`hooks/`)
| Hook | Purpose |
|------|---------|
| `use-toast.ts` | Toast notification hook (Sonner) |

### Utilities (`lib/`)
| File | Purpose |
|------|---------|
| `api.ts` | Product API functions: `getProducts`, `getProduct`, `addProduct`, `updateProduct`, `deleteProduct` |
| `utils.ts` | `cn()` function for Tailwind class merging (clsx + tailwind-merge) |

---

## External Integrations

| Service | Purpose | Notes |
|---------|---------|-------|
| **OpenAI API** | AI Chatbot | GPT-4o-mini model, detects product names in responses |
| **Stripe** | Card Payments | VISA, Mastercard + Swiss TWINT via Stripe |
| **PayPal** | Alternative Payments | Full flow with success/cancel pages |
| **PHP MySQL Backend** | Data & Business Logic | `web.lweb.ch/shop` |
| **SMTP Email** | Confirmations & Notifications | Via `email_functions.php` |
| **Vercel Analytics** | Visit Tracking | `@vercel/analytics` |
| **Vercel** | Frontend Hosting | Automatic deployment from Git |

---

## State Management

### Client State (localStorage)
| Key | Content |
|-----|---------|
| `cantina-cart` | Shopping cart items |
| `cantina-customer-info` | Customer data for checkout |
| `cantina-cart-count` | Item count |
| `admin-login-state` | Admin session with 7-day expiry |
| `cart-should-be-cleared` | Flag to clear cart after payment |
| `last-payment` | Last payment status |
| `seen-announcement-X` | Tracks which announcements have been seen |
| `pending-email` | Retry mechanism for failed confirmation emails |

### API Caching (Next.js)
- Products: 30-second in-memory TTL
- Blog posts: configurable TTL
- Gallery: configurable TTL
- Announcements: configurable TTL

---

## Main Flows

### Purchase Flow
```
1. User browses products → adds to cart (localStorage)
2. Opens cart → clicks "Checkout"
3. Fills in customer and address data
4. Selects payment method:
   ├── Stripe/TWINT → PaymentIntent → card form
   ├── PayPal → redirect to PayPal → /success or /cancel
   └── Invoice → data saved, order pending
5. Payment success → PHP saves order → confirmation email → cart cleared
```

### Chatbot Flow
```
1. User opens floating bot
2. Message sent → /api/chat → OpenAI GPT-4o-mini
3. Response analysed to detect product names
4. Detected products → loaded from PHP API
5. Product carousel displayed inline in chat
```

### Admin Auth Flow
```
1. Access /adminsevelen
2. Login modal → email + password
3. Verification (credentials from .env)
4. Session saved in localStorage with 7-day expiry
5. Admin panel unlocked with all management functions
```

---

## Admin Dashboard

Access: `/adminsevelen` — Authentication required

### Tabs & Functions

#### Products
- List all products with images, price, stock
- Add product: name, description, price, images (up to 4), origin, badge, category, stock
- Edit existing product
- Delete product
- Import from Excel (xlsx) with automatic image download
- Export products to Excel

#### Orders
- Dashboard with stats: total revenue, pending orders, total orders
- Full order list with status filters
- View order detail: items, customer, address, payment method
- Change status: Pending → Processing → Shipped → Delivered
- Mark as shipped with automatic email notification to customer

#### Categories
- List existing categories
- Create new category (name + slug)
- Edit category name/slug
- Delete category

#### Blog
- List blog posts
- Create post: title, content (Markdown), hero image + 3 additional images
- Edit existing post
- Markdown rendering with sanitization

#### Gallery
- View all gallery images
- Upload new image with custom title
- Delete image
- Images displayed in grid with lightbox

#### Announcements
- Create promotional modal/announcement
- Configure: type, title, subtitle, images (up to 2), product link
- Enable/disable announcement
- "Show only once per user" option

#### Payment Settings
- Enable/disable PayPal
- Enable/disable Stripe (card)
- Enable/disable TWINT
- Enable/disable invoice payment
- Changes take effect immediately in checkout

#### Shipping Settings
- Define shipping costs by zone/weight
- Real-time update for checkout

#### Users
- View list of registered users
- Manage user accounts

#### Import/Export
- Import full catalogue from Excel
- Export catalogue to Excel
- Clean up previous imports

---

## Payment System

### Stripe (Credit/Debit Card)
- VISA and Mastercard
- PaymentIntent created server-side via `/api/stripe/create-payment-intent`
- Confirmation handled client-side with Stripe.js
- Webhooks at `/api/stripe/webhook` for async events
- Card form embedded in checkout

### TWINT (Switzerland)
- Swiss payment method via Stripe
- `stripe-twint-payment.tsx` component
- Same flow as Stripe but with TWINT method

### PayPal
- Redirect to PayPal flow
- Returns to `/success` or `/cancel`
- `/success` page processes the order and saves to DB
- Retry mechanism for confirmation emails

### Invoice
- Order saved with "pending payment" status
- Confirmation email with bank details
- Enabled/disabled from admin panel

---

## Configuration & Environment Variables

### `.env` (required)
```env
API_BASE_URL=https://web.lweb.ch/shop       # PHP backend URL
STRIPE_SECRET_KEY=sk_...                     # Stripe secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...   # Stripe public key
STRIPE_WEBHOOK_SECRET=whsec_...             # Stripe webhook secret
OPENAI_API_KEY=sk-...                        # OpenAI key
ADMIN_EMAIL=admin@...                        # Admin email
ADMIN_PASSWORD=...                           # Admin password
PAYPAL_CLIENT_ID=...                         # PayPal Client ID
PAYPAL_CLIENT_SECRET=...                     # PayPal secret
```

### `next.config.mjs`
- ESLint and TypeScript errors ignored in build (allows fast deploy)
- Images unoptimized (`unoptimized: true`) for compatibility with external URLs

### `tailwind.config.ts`
- Custom colours: sidebar, charts
- Animations: accordion open/close
- Dark mode: class-based

---

## Estimated Price for Switzerland

> Estimates based on Swiss market rates (2025/2026). Swiss rates are significantly higher than other European countries.

### Breakdown by Module

| Module | Est. Hours | CHF (100–150/h) |
|--------|-----------|-----------------|
| Next.js setup + base architecture | 20–30h | CHF 2,000 – 4,500 |
| UI/UX design + Tailwind + shadcn/ui | 40–60h | CHF 4,000 – 9,000 |
| Product catalogue + filters + pagination | 30–40h | CHF 3,000 – 6,000 |
| Shopping cart + full checkout | 30–40h | CHF 3,000 – 6,000 |
| Payment system (Stripe + TWINT + PayPal + Invoice) | 40–60h | CHF 4,000 – 9,000 |
| PHP backend + MySQL + all endpoints | 60–80h | CHF 6,000 – 12,000 |
| Full admin dashboard | 60–80h | CHF 6,000 – 12,000 |
| User system (auth, profile, orders) | 25–35h | CHF 2,500 – 5,250 |
| Blog with CMS + Markdown + lightbox | 20–30h | CHF 2,000 – 4,500 |
| Image gallery | 10–15h | CHF 1,000 – 2,250 |
| AI chatbot (OpenAI + product detection) | 20–30h | CHF 2,000 – 4,500 |
| Announcement/modal system | 10–15h | CHF 1,000 – 2,250 |
| Transactional emails (confirmation, shipping) | 10–15h | CHF 1,000 – 2,250 |
| Animations + UX (fade, lightbox, zoom) | 10–15h | CHF 1,000 – 2,250 |
| Testing, QA and fixes | 20–30h | CHF 2,000 – 4,500 |
| Deployment + Vercel + DNS setup | 5–10h | CHF 500 – 1,500 |

### Total Development Cost

| Scenario | Total Hours | Estimated Cost |
|----------|------------|----------------|
| **Minimum** (junior/mid, Swiss offshore) | ~410h | **CHF 30,000 – 40,000** |
| **Realistic** (standard Swiss agency) | ~410h | **CHF 45,000 – 65,000** |
| **Premium** (top-tier Zurich/Geneva agency) | ~410h | **CHF 65,000 – 90,000** |

### Annual Recurring Costs

| Service | Estimated Cost |
|---------|---------------|
| Vercel hosting (Pro) | CHF 240/year |
| PHP + MySQL hosting (external server) | CHF 300 – 600/year |
| .ch domain | CHF 15 – 30/year |
| Stripe (per transaction) | 1.5% + CHF 0.30 per payment |
| PayPal (per transaction) | 2.49% + CHF 0.35 per payment |
| OpenAI API (chatbot) | CHF 5 – 50/month (usage-based) |
| Maintenance and updates | CHF 150 – 300/month |
| **Estimated total recurring** | **CHF 3,000 – 5,000/year** |

> Swiss VAT (MWST) of 8.1% may apply on top if the provider is VAT-registered.

---

## Client Summary

A fully custom-built online store has been developed for selling hunting, fishing and outdoor accessories.

Customers can browse products, add them to their cart and pay by card, TWINT, PayPal or invoice. Each buyer receives an order confirmation by email and can track their orders from their personal account.

All content — products, prices, stock, blog, gallery, banners and payment settings — is managed from a private admin panel, with no technical knowledge required.

The store also features an AI-powered virtual assistant that answers customer questions in real time.

**Estimated investment — Swiss market:**
- Full development: **CHF 45,000 – 65,000**
- Annual maintenance: **CHF 3,000 – 5,000/year**

---

*Documentation generated on 27 February 2026 — Demo Shop*
