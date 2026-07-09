# NJE — Novelty Jewellery Emporium (Product Catalogue)

## Original problem statement
Full-stack, open-source Product Catalogue with a customer-facing gallery
and an admin dashboard. Categories, dual-handle price slider (min ₹50 →
dynamic max), search, sort, per-category auto-incrementing item numbers,
category CRUD + reorder, drag-and-drop image uploads, bulk actions,
analytics. Business is NJE — silver-plated / gilat / junk jewellery in INR.

## User choices
- Auth: **JWT-based custom auth**
- Image storage: **Emergent-managed cloud object storage**
- Admin credentials: default `admin@nje.com` / `Admin@123` (from `.env`)
- Currency: **INR (₹)** — NJE catalogue
- Design: modern minimal e-commerce (design agent's Earthy Elegance theme)
- Sample data: **seeded** 6 categories, 8 demo products

## Architecture
- FastAPI backend, single `server.py`, all routes prefixed with `/api`
- MongoDB via Motor (uuid string IDs, ISO datetimes, per-category counters)
- Emergent object storage for uploads, `/api/files/{path}` public image proxy
- JWT (12h) — token returned in response AND set as `access_token` cookie
- React frontend with `AuthProvider`, protected admin routes, Shadcn/UI, Recharts

## Personas
- **Shopper** — browses catalogue, filters, opens detail page
- **NJE staff / admin** — logs in, manages products/categories/analytics

## Core requirements (static)
- Public catalogue: grid, sidebar filters (categories, price slider), search, sort, detail page
- Admin: login, product CRUD, category CRUD + reorder, per-category item numbers, drag-drop image upload, bulk actions, analytics
- No hardcoded secrets, env-driven

## Implemented (2026-02)
- ✅ FastAPI backend with auth, categories, products, upload, analytics
- ✅ Emergent object storage integration (init, put, get, retry on 403)
- ✅ Admin/demo seeding on startup
- ✅ React customer catalogue with hero, sidebar filters, dual-handle slider, search, sort
- ✅ Product detail page
- ✅ Admin login, dashboard overview, product list with bulk actions, product create/edit with image upload, category CRUD + drag reorder, analytics with Recharts
- ✅ README, .env templates, test credentials

## Backlog / next
- P1: Multi-image gallery per product
- P1: Public homepage curated collections
- P2: Public share links / Pinterest-friendly OG tags for shareability
- P2: Wishlist / enquiry form for customers
- P2: CSV import for bulk product upload
