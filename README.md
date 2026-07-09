# NJE — Novelty Jewellery Emporium (Product Catalogue)

An open-source, full-stack **product catalogue** application built for
**NJE — Novelty Jewellery Emporium** (silver-plated ornaments, *gilat*
handcrafts and junk jewellery, priced in Indian Rupees ₹).

- **Frontend:** React 19 + Tailwind + Shadcn/UI + Recharts
- **Backend:** FastAPI + Motor (MongoDB)
- **Auth:** JWT (bcrypt-hashed passwords, admin-only console)
- **Images:** Emergent-managed object storage (drag-and-drop upload)

---

## Features

### Customer catalogue (public)
- Responsive product gallery with image, name, category, price, item number
- Category multi-select filter
- Dual-handle price range slider (₹50 → dynamic max)
- Combine category + price + free-text search filters
- Sort: newest, price low → high, price high → low
- Product detail page with large image, description, category and item number

### Admin dashboard
- Secure JWT email/password login (admin-only)
- Product CRUD with drag-and-drop image upload (single upload with instant preview)
- Auto-incrementing item numbers scoped per category (e.g. `NJE-Silver-001`, `NJE-Junk-002`)
- Category CRUD — create, rename, delete, drag-to-reorder
- Product table with search, category filter, bulk delete and bulk category change
- Analytics: products per category + price range distribution charts

---

## Project structure

```
/app
├── backend/
│   ├── server.py            # FastAPI app (all endpoints under /api)
│   ├── requirements.txt
│   └── .env                 # backend env vars (see below)
└── frontend/
    └── src/
        ├── App.js           # routing
        ├── lib/api.js       # axios instance + helpers
        ├── contexts/AuthContext.jsx
        ├── components/      # layouts, cards, filters, image upload
        └── pages/           # Catalogue, ProductDetail, Admin*
```

---

## Environment variables

### `backend/.env`
```dotenv
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="https://your-frontend-url,http://localhost:3000"
JWT_SECRET="<64-char random hex>"
ADMIN_EMAIL="admin@nje.com"
ADMIN_PASSWORD="Admin@123"
EMERGENT_LLM_KEY="sk-emergent-xxxxx"
APP_NAME="nje-catalogue"
SEED_DEMO="true"
```

### `frontend/.env`
```dotenv
REACT_APP_BACKEND_URL=https://your-backend-url
```

**No secrets are hardcoded — everything is loaded from `.env`.**

---

## Running locally

### Prerequisites
- Node.js 18+ (Yarn 1.22+)
- Python 3.11+
- MongoDB running on `localhost:27017` (or any URL set in `MONGO_URL`)

### Backend
```bash
cd backend
pip install -r requirements.txt
# Start via uvicorn (dev). In our container it runs via supervisor on 0.0.0.0:8001.
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

On first startup the backend will:
- create MongoDB indexes,
- seed the admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD`,
- optionally seed 6 demo categories and 8 demo products (`SEED_DEMO=true`).

### Frontend
```bash
cd frontend
yarn install
yarn start
```

---

## Default admin credentials (from `.env`)

- Email: `admin@nje.com`
- Password: `Admin@123`

Change these in `backend/.env` and restart the backend — the seeder re-syncs the
password hash on the next start.

---

## API — quick reference

All routes are prefixed with `/api`.

| Method | Path                              | Auth  | Purpose                              |
|--------|-----------------------------------|-------|--------------------------------------|
| POST   | `/auth/login`                     | —     | Login, returns JWT + sets cookie     |
| POST   | `/auth/logout`                    | any   | Clears cookie                        |
| GET    | `/auth/me`                        | user  | Current user                         |
| GET    | `/categories`                     | —     | List categories with counts          |
| POST   | `/categories`                     | admin | Create category                      |
| PATCH  | `/categories/{id}`                | admin | Rename / reorder                     |
| POST   | `/categories/reorder`             | admin | Save new order                       |
| DELETE | `/categories/{id}`                | admin | Delete empty category                |
| GET    | `/products`                       | —     | List (filters + search + sort)       |
| GET    | `/products/{id}`                  | —     | Product detail                       |
| POST   | `/products`                       | admin | Create                               |
| PATCH  | `/products/{id}`                  | admin | Update                               |
| DELETE | `/products/{id}`                  | admin | Delete                               |
| POST   | `/products/bulk-delete`           | admin | Bulk delete                          |
| POST   | `/products/bulk-update-category`  | admin | Bulk move                            |
| POST   | `/upload`                         | admin | Upload product image                 |
| GET    | `/files/{path:path}`              | —     | Serve uploaded image                 |
| GET    | `/analytics`                      | admin | Dashboard analytics                  |
| GET    | `/meta`                           | —     | min/max price, currency              |

---

## License

MIT — free to use, modify and publish as an open-source repository.
