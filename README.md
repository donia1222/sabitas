# Demo Shop — Complete Technical Documentation

> Plantilla completa de tienda online para demostraciones. Features admin dashboard, CMS, AI chatbot, multiple payment methods and PHP backend.

**Tienda de demostración** — plantilla para enseñar a clientes potenciales.

**Store:** Demo Shop · Musterstrasse 1, 8000 Musterstadt · 000 000 00 00 · info@lweb.ch

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
16. [Getting Started](#getting-started)
17. [Estimated Price for Switzerland](#estimated-price-for-switzerland)
18. [Client Summary](#client-summary)

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

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
git clone <repo-url>
cd hot-sauce-store-main
npm install
```

### Development
```bash
npm run dev       # http://localhost:3000
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Lint
```


*Documentation generated on 27 February 2026 — Demo Shop*
