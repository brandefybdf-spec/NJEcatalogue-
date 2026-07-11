"""NJE Novelty Jewellery Emporium — Product Catalogue backend.

FastAPI + MongoDB + JWT auth + Cloudinary storage for product images.
All routes are prefixed with /api.
"""

from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import re
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
import httpx
import cloudinary
import cloudinary.uploader
from io import BytesIO
from fastapi import (
    FastAPI,
    APIRouter,
    HTTPException,
    Depends,
    Request,
    Response,
    UploadFile,
    File,
    Query,
    status,
)
from fastapi.responses import Response as FastAPIResponse, RedirectResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nje.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@123")
APP_NAME = os.environ.get("APP_NAME", "nje-catalogue")
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",")]
SEED_DEMO = os.environ.get("SEED_DEMO", "true").lower() == "true"

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True,
)

# ---------- App / DB ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("nje")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="NJE Catalogue API")
api = APIRouter(prefix="/api")

# ---------- Object storage helpers ----------
def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file bytes to Cloudinary under {APP_NAME}/products. Returns a dict with
    at least 'path' (Cloudinary public_id) and 'size' (bytes), plus 'secure_url'."""
    public_id = Path(path).stem
    try:
        result = cloudinary.uploader.upload(
            BytesIO(data),
            folder=f"{APP_NAME}/products",
            public_id=public_id,
            resource_type="image",
        )
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        raise HTTPException(status_code=502, detail="Upload failed")
    return {
        "path": result["public_id"],
        "size": result.get("bytes"),
        "secure_url": result["secure_url"],
        "url": result.get("url"),
    }


# ---------- Auth helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ---------- Models ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=60)
    order: Optional[int] = None


class CategoryReorder(BaseModel):
    order: List[str]  # list of category ids in desired order


class ProductImage(BaseModel):
    url: str
    path: Optional[str] = None


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=140)
    description: str = ""
    price: float = Field(ge=0)
    category_id: str
    image_url: str = ""
    image_path: Optional[str] = None
    images: List[ProductImage] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[str] = None
    image_url: Optional[str] = None
    image_path: Optional[str] = None
    images: Optional[List[ProductImage]] = None


class BulkIdsRequest(BaseModel):
    ids: List[str]


class BulkUpdateCategoryRequest(BaseModel):
    ids: List[str]
    category_id: str


# ---------- Utility ----------
def slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-")
    return s or "cat"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def next_item_number(category_slug: str) -> str:
    """Atomically increment per-category counter and return zero-padded item number."""
    doc = await db.counters.find_one_and_update(
        {"_id": f"cat_{category_slug}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = doc.get("seq") if doc else 1
    if not seq:
        seq = 1
    return f"NJE-{category_slug}-{str(seq).zfill(3)}"


async def hydrate_product(p: dict) -> dict:
    """Attach category name to a product doc; strip mongo _id."""
    p.pop("_id", None)
    cat = await db.categories.find_one({"id": p.get("category_id")}, {"_id": 0, "name": 1, "slug": 1})
    p["category_name"] = cat["name"] if cat else "Uncategorised"
    p["category_slug"] = cat["slug"] if cat else ""
    return p


async def _load_categories_by_id() -> dict:
    cats = await db.categories.find({}, {"_id": 0, "id": 1, "name": 1, "slug": 1}).to_list(None)
    return {c["id"]: c for c in cats}


def _attach_category(p: dict, categories_by_id: dict) -> dict:
    """Attach category name to a product doc using a preloaded lookup dict; strip mongo _id."""
    p.pop("_id", None)
    cat = categories_by_id.get(p.get("category_id"))
    p["category_name"] = cat["name"] if cat else "Uncategorised"
    p["category_slug"] = cat["slug"] if cat else ""
    return p


# ---------- Auth routes ----------
@api.post("/auth/login")
async def login(payload: LoginRequest, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"])
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 12,
        path="/",
    )
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]},
    }


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- Categories ----------
@api.get("/categories")
async def list_categories():
    cats = await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    # Attach product counts
    for c in cats:
        c["product_count"] = await db.products.count_documents({"category_id": c["id"]})
    return cats


@api.post("/categories")
async def create_category(payload: CategoryCreate, _: dict = Depends(require_admin)):
    name = payload.name.strip()
    slug = slugify(name)
    existing = await db.categories.find_one({"$or": [{"name": name}, {"slug": slug}]})
    if existing:
        raise HTTPException(status_code=409, detail="Category already exists")
    count = await db.categories.count_documents({})
    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "slug": slug,
        "order": count,
        "created_at": now_iso(),
    }
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    doc["product_count"] = 0
    return doc


@api.patch("/categories/{cat_id}")
async def update_category(cat_id: str, payload: CategoryUpdate, _: dict = Depends(require_admin)):
    cat = await db.categories.find_one({"id": cat_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    update: dict = {}
    if payload.name and payload.name.strip() != cat["name"]:
        new_name = payload.name.strip()
        new_slug = slugify(new_name)
        conflict = await db.categories.find_one({"$or": [{"name": new_name}, {"slug": new_slug}], "id": {"$ne": cat_id}})
        if conflict:
            raise HTTPException(status_code=409, detail="Another category has this name")
        update["name"] = new_name
        update["slug"] = new_slug
        # denormalised category name on products stays fresh through hydrate_product
    if payload.order is not None:
        update["order"] = payload.order
    if update:
        await db.categories.update_one({"id": cat_id}, {"$set": update})
    updated = await db.categories.find_one({"id": cat_id}, {"_id": 0})
    updated["product_count"] = await db.products.count_documents({"category_id": cat_id})
    return updated


@api.post("/categories/reorder")
async def reorder_categories(payload: CategoryReorder, _: dict = Depends(require_admin)):
    for i, cid in enumerate(payload.order):
        await db.categories.update_one({"id": cid}, {"$set": {"order": i}})
    return {"ok": True}


@api.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, _: dict = Depends(require_admin)):
    cat = await db.categories.find_one({"id": cat_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    count = await db.products.count_documents({"category_id": cat_id})
    if count > 0:
        raise HTTPException(status_code=400, detail=f"Category has {count} products. Move or delete them first.")
    await db.categories.delete_one({"id": cat_id})
    return {"ok": True}


# ---------- Meta (max price etc) ----------
@api.get("/meta")
async def get_meta():
    max_doc = await db.products.find({}, {"_id": 0, "price": 1}).sort("price", -1).limit(1).to_list(1)
    max_price = int(max_doc[0]["price"]) if max_doc else 5000
    if max_price < 100:
        max_price = 100
    return {"min_price": 50, "max_price": max_price, "app_name": "NJE", "currency": "INR"}


# ---------- Products ----------
@api.get("/products")
async def list_products(
    category_id: Optional[str] = Query(None),
    categories: Optional[str] = Query(None, description="Comma-separated category ids"),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("newest"),
    limit: int = Query(200, le=500),
):
    q: dict = {}
    cat_ids = []
    if category_id:
        cat_ids.append(category_id)
    if categories:
        cat_ids.extend([c for c in categories.split(",") if c])
    if cat_ids:
        q["category_id"] = {"$in": cat_ids}
    if min_price is not None or max_price is not None:
        pr: dict = {}
        if min_price is not None:
            pr["$gte"] = min_price
        if max_price is not None:
            pr["$lte"] = max_price
        q["price"] = pr
    if search:
        q["name"] = {"$regex": re.escape(search), "$options": "i"}

    sort_map = {
        "newest": [("created_at", -1)],
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
    }
    sort_spec = sort_map.get(sort, sort_map["newest"])
    cursor = db.products.find(q).sort(sort_spec).limit(limit)
    categories_by_id = await _load_categories_by_id()
    items = []
    async for p in cursor:
        items.append(_attach_category(p, categories_by_id))
    return items


def _products_filter_from_params(
    category_id: Optional[str],
    categories: Optional[str],
    min_price: Optional[float],
    max_price: Optional[float],
    search: Optional[str],
) -> dict:
    q: dict = {}
    cat_ids = []
    if category_id:
        cat_ids.append(category_id)
    if categories:
        cat_ids.extend([c for c in categories.split(",") if c])
    if cat_ids:
        q["category_id"] = {"$in": cat_ids}
    if min_price is not None or max_price is not None:
        pr: dict = {}
        if min_price is not None:
            pr["$gte"] = min_price
        if max_price is not None:
            pr["$lte"] = max_price
        q["price"] = pr
    if search:
        q["name"] = {"$regex": re.escape(search), "$options": "i"}
    return q


async def _fetch_product_image_bytes(product: dict, client: httpx.AsyncClient, sem: asyncio.Semaphore) -> Optional[bytes]:
    """Try to fetch image bytes for a product. Returns None if unavailable (never raises)."""
    url = product.get("image_url") or ""
    if not (url.startswith("http://") or url.startswith("https://")):
        return None
    try:
        async with sem:
            r = await client.get(url, timeout=8.0)
        if r.status_code == 200:
            return r.content
    except Exception as e:
        logger.warning(f"image fetch failed for {product.get('id')}: {e}")
    return None


async def _fetch_all_product_images(products: list, concurrency: int = 15) -> dict:
    """Concurrently fetch cover images for a list of products, capped at `concurrency`
    simultaneous requests. Failed/slow images are skipped (logged), never fail the batch."""
    sem = asyncio.Semaphore(concurrency)
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[_fetch_product_image_bytes(p, client, sem) for p in products])
    return {p["id"]: img for p, img in zip(products, results) if img is not None}


def _rupee(v: float) -> str:
    # Use Rs. prefix — reportlab default fonts don't include the ₹ glyph reliably.
    return f"Rs. {int(round(float(v))):,}"


def _build_catalogue_pdf(products: list, image_bytes_map: Optional[dict] = None, ids_filter: Optional[set] = None) -> bytes:
    """4-up (2x2) product catalogue PDF with image + name + item# + price."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas as pdfcanvas
    from PIL import Image

    buf = BytesIO()
    W, H = A4
    c = pdfcanvas.Canvas(buf, pagesize=A4)

    margin = 15 * mm
    header_h = 22 * mm
    cols, rows = 2, 2
    per_page = cols * rows
    grid_w = W - 2 * margin
    grid_h = H - 2 * margin - header_h
    cell_w = grid_w / cols
    cell_h = grid_h / rows

    image_bytes_map = image_bytes_map or {}
    filtered = [p for p in products if not ids_filter or p["id"] in ids_filter]
    total = len(filtered)
    pages = max(1, (total + per_page - 1) // per_page)

    for page_idx in range(pages):
        # Header
        c.setFillColor(colors.HexColor("#1C1917"))
        c.setFont("Helvetica-Bold", 14)
        c.drawString(margin, H - margin - 4 * mm, "NJE — Novelty Jewellery Emporium")
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#8C5A4F"))
        c.drawString(margin, H - margin - 9 * mm, "Aatmaram Satish Kumar Gilat Wale · Since 1951")
        c.setFillColor(colors.HexColor("#575F66"))
        c.setFont("Helvetica", 8)
        c.drawRightString(W - margin, H - margin - 4 * mm, datetime.now(timezone.utc).strftime("%d %b %Y"))
        c.drawRightString(W - margin, H - margin - 9 * mm, f"Page {page_idx + 1} of {pages}  ·  {total} items")
        c.setStrokeColor(colors.HexColor("#E5E5E5"))
        c.setLineWidth(0.5)
        c.line(margin, H - margin - header_h + 4 * mm, W - margin, H - margin - header_h + 4 * mm)

        start = page_idx * per_page
        for i in range(per_page):
            idx = start + i
            if idx >= total:
                break
            product = filtered[idx]
            col = i % cols
            row = i // cols
            x = margin + col * cell_w
            y = H - margin - header_h - (row + 1) * cell_h
            pad = 6 * mm
            img_area_w = cell_w - 2 * pad
            img_area_h = cell_h - 2 * pad - 20 * mm  # leave room for text

            # Image
            img_bytes = image_bytes_map.get(product["id"])
            if img_bytes:
                try:
                    im = Image.open(BytesIO(img_bytes)).convert("RGB")
                    iw, ih = im.size
                    ratio = min(img_area_w / iw, img_area_h / ih)
                    draw_w = iw * ratio
                    draw_h = ih * ratio
                    im.thumbnail((int(draw_w * 3), int(draw_h * 3)))  # limit resolution
                    ibuf = BytesIO()
                    im.save(ibuf, format="JPEG", quality=80)
                    ibuf.seek(0)
                    from reportlab.lib.utils import ImageReader
                    ir = ImageReader(ibuf)
                    img_x = x + pad + (img_area_w - draw_w) / 2
                    img_y = y + cell_h - pad - draw_h
                    c.drawImage(ir, img_x, img_y, width=draw_w, height=draw_h, mask="auto")
                except Exception as e:
                    logger.warning(f"embed failed: {e}")

            # Text block
            tx = x + pad
            ty = y + pad + 10 * mm
            c.setFillColor(colors.HexColor("#575F66"))
            c.setFont("Helvetica", 7)
            c.drawString(tx, ty + 12 * mm, (product.get("category_name") or "").upper())
            c.setFillColor(colors.HexColor("#1C1917"))
            c.setFont("Helvetica-Bold", 10)
            name = product.get("name", "")
            if len(name) > 42:
                name = name[:40] + "…"
            c.drawString(tx, ty + 7 * mm, name)
            c.setFont("Helvetica-Oblique", 8)
            c.setFillColor(colors.HexColor("#8C5A4F"))
            c.drawString(tx, ty + 2 * mm, product.get("item_number", ""))
            c.setFont("Helvetica-Bold", 11)
            c.setFillColor(colors.HexColor("#1C1917"))
            c.drawRightString(x + cell_w - pad, ty + 2 * mm, _rupee(product.get("price", 0)))

        c.showPage()

    c.save()
    buf.seek(0)
    return buf.getvalue()


def _build_pricelist_pdf(products: list, ids_filter: Optional[set] = None) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

    filtered = [p for p in products if not ids_filter or p["id"] in ids_filter]

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm, topMargin=15 * mm, bottomMargin=15 * mm)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("<b>NJE — Novelty Jewellery Emporium</b>", styles["Title"]))
    story.append(Paragraph("<i>Aatmaram Satish Kumar Gilat Wale · Since 1951</i>", styles["Italic"]))
    story.append(Paragraph(
        f"Price list · {len(filtered)} items · Generated {datetime.now(timezone.utc).strftime('%d %b %Y')}",
        styles["Normal"],
    ))
    story.append(Spacer(1, 8 * mm))

    data = [["Item #", "Name", "Category", "Price"]]
    for p in filtered:
        data.append([
            p.get("item_number", ""),
            p.get("name", ""),
            p.get("category_name", ""),
            _rupee(p.get("price", 0)),
        ])

    tbl = Table(data, colWidths=[30 * mm, 80 * mm, 40 * mm, 30 * mm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1C1917")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("ALIGN", (3, 0), (3, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FAFAFA"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E5E5")),
        ("FONTNAME", (0, 1), (0, -1), "Courier"),
    ]))
    story.append(tbl)

    doc.build(story)
    buf.seek(0)
    return buf.getvalue()


@api.get("/products/export-pdf")
async def export_products_pdf(
    style: str = Query("catalogue", regex="^(catalogue|pricelist)$"),
    category_id: Optional[str] = Query(None),
    categories: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    ids: Optional[str] = Query(None, description="Comma-separated product ids to include (overrides filters if given)"),
    _: dict = Depends(require_admin),
):
    q = _products_filter_from_params(category_id, categories, min_price, max_price, search)
    cursor = db.products.find(q).sort([("created_at", -1)]).limit(500)
    products = []
    async for p in cursor:
        products.append(await hydrate_product(p))

    id_set: Optional[set] = None
    if ids:
        id_set = set([i for i in ids.split(",") if i])
        products = [p for p in products if p["id"] in id_set]

    if not products:
        raise HTTPException(status_code=404, detail="No products match the current filters.")

    if style == "pricelist":
        pdf_bytes = _build_pricelist_pdf(products)
        fname = f"nje-pricelist-{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    else:
        image_bytes_map = await _fetch_all_product_images(products)
        pdf_bytes = _build_catalogue_pdf(products, image_bytes_map=image_bytes_map)
        fname = f"nje-catalogue-{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"

    return FastAPIResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@api.get("/products/{product_id}")
async def get_product(product_id: str):
    p = await db.products.find_one({"id": product_id})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return await hydrate_product(p)


@api.post("/products")
async def create_product(payload: ProductCreate, _: dict = Depends(require_admin)):
    cat = await db.categories.find_one({"id": payload.category_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    item_number = await next_item_number(cat["slug"])
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "description": payload.description or "",
        "price": float(payload.price),
        "category_id": payload.category_id,
        "item_number": item_number,
        "image_url": payload.image_url or "",
        "image_path": payload.image_path,
        "images": [img.model_dump() for img in payload.images],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.products.insert_one(doc)
    return await hydrate_product(doc)


@api.patch("/products/{product_id}")
async def update_product(product_id: str, payload: ProductUpdate, _: dict = Depends(require_admin)):
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "category_id" in data and data["category_id"] != existing["category_id"]:
        cat = await db.categories.find_one({"id": data["category_id"]})
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
        # Regenerate item number in the new category
        data["item_number"] = await next_item_number(cat["slug"])
    data["updated_at"] = now_iso()
    await db.products.update_one({"id": product_id}, {"$set": data})
    updated = await db.products.find_one({"id": product_id})
    return await hydrate_product(updated)


@api.delete("/products/{product_id}")
async def delete_product(product_id: str, _: dict = Depends(require_admin)):
    res = await db.products.delete_one({"id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


@api.post("/products/bulk-delete")
async def bulk_delete_products(payload: BulkIdsRequest, _: dict = Depends(require_admin)):
    res = await db.products.delete_many({"id": {"$in": payload.ids}})
    return {"deleted": res.deleted_count}


@api.post("/products/bulk-update-category")
async def bulk_update_category(payload: BulkUpdateCategoryRequest, _: dict = Depends(require_admin)):
    cat = await db.categories.find_one({"id": payload.category_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    updated = 0
    for pid in payload.ids:
        item_number = await next_item_number(cat["slug"])
        r = await db.products.update_one(
            {"id": pid},
            {"$set": {"category_id": payload.category_id, "item_number": item_number, "updated_at": now_iso()}},
        )
        updated += r.modified_count
    return {"updated": updated}


# ---------- Upload ----------
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@api.post("/upload")
async def upload_image(file: UploadFile = File(...), _: dict = Depends(require_admin)):
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    ext = (file.filename or "img").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    path = f"{APP_NAME}/products/{uuid.uuid4()}.{ext}"
    try:
        result = put_object(path, data, content_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=502, detail="Upload failed")
    stored_path = result["path"]
    image_url = result["secure_url"]
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": stored_path,
        "secure_url": image_url,
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size"),
        "created_at": now_iso(),
    })
    return {"path": stored_path, "url": image_url, "content_type": content_type}


# Legacy image links — redirect to the Cloudinary CDN URL instead of proxying bytes.
@app.get("/api/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path}, {"_id": 0, "secure_url": 1})
    if not record or not record.get("secure_url"):
        raise HTTPException(status_code=404, detail="File not found")
    return RedirectResponse(url=record["secure_url"], status_code=307)


# ---------- Analytics ----------
@api.get("/analytics")
async def analytics(_: dict = Depends(require_admin)):
    cats = await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    per_category = []
    for c in cats:
        cnt = await db.products.count_documents({"category_id": c["id"]})
        per_category.append({"category_id": c["id"], "name": c["name"], "count": cnt})

    # Price buckets (INR)
    buckets = [
        (0, 500, "< ₹500"),
        (500, 1000, "₹500 – ₹1K"),
        (1000, 2500, "₹1K – ₹2.5K"),
        (2500, 5000, "₹2.5K – ₹5K"),
        (5000, 10000, "₹5K – ₹10K"),
        (10000, 10**9, "₹10K+"),
    ]
    price_dist = []
    for lo, hi, label in buckets:
        cnt = await db.products.count_documents({"price": {"$gte": lo, "$lt": hi}})
        price_dist.append({"range": label, "count": cnt})

    total_products = await db.products.count_documents({})
    total_categories = await db.categories.count_documents({})
    return {
        "total_products": total_products,
        "total_categories": total_categories,
        "per_category": per_category,
        "price_distribution": price_dist,
    }


# ---------- Health ----------
@api.get("/")
async def root():
    return {"service": "NJE Catalogue API", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_origin_regex=r"https://nj-ecatalogue.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


# ---------- Seed ----------
DEMO_CATEGORIES = [
    {"name": "Silver Plated", "slug": "Silver"},
    {"name": "Gilat Handcrafts", "slug": "Gilat"},
    {"name": "Junk Jewellery", "slug": "Junk"},
    {"name": "Earrings", "slug": "Earrings"},
    {"name": "Necklaces", "slug": "Necklaces"},
    {"name": "Bangles", "slug": "Bangles"},
]

DEMO_PRODUCTS = [
    {
        "name": "Oxidised Silver Jhumka Set",
        "description": "Handcrafted oxidised silver-plated jhumkas with delicate filigree and pearl drops.",
        "price": 1450,
        "category": "Earrings",
        "image_url": "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwxfHxzaWx2ZXIlMjBqZXdlbHJ5JTIwZWFycmluZ3N8ZW58MHx8fHwxNzgzNjE3MDUwfDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "name": "Emerald Meenakari Studs",
        "description": "Gilat-finish stud earrings featuring green and white enamel work — everyday festive charm.",
        "price": 890,
        "category": "Gilat Handcrafts",
        "image_url": "https://images.unsplash.com/photo-1716461534906-d31a17008801?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwzfHxzaWx2ZXIlMjBqZXdlbHJ5JTIwZWFycmluZ3N8ZW58MHx8fHwxNzgzNjE3MDUwfDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "name": "Turquoise Bead Necklace",
        "description": "Statement neckpiece strung with hand-turned turquoise beads and antique silver spacers.",
        "price": 2350,
        "category": "Necklaces",
        "image_url": "https://images.unsplash.com/photo-1756792339487-d044709b27f2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwzfHxoYW5kbWFkZSUyMGV0aG5pYyUyMG5lY2tsYWNlfGVufDB8fHx8MTc4MzYxNzA1MHww&ixlib=rb-4.1.0&q=85",
    },
    {
        "name": "Rainbow Junk Layered Necklace",
        "description": "Playful layered strands of hand-painted glass beads. Perfect summer statement piece.",
        "price": 650,
        "category": "Junk Jewellery",
        "image_url": "https://images.unsplash.com/photo-1778230501926-3b8a3f2bb5f4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHw0fHxoYW5kbWFkZSUyMGV0aG5pYyUyMG5lY2tsYWNlfGVufDB8fHx8MTc4MzYxNzA1MHww&ixlib=rb-4.1.0&q=85",
    },
    {
        "name": "Antique Kada Stack (Set of 4)",
        "description": "Rich gold-toned kadas with intricate ornate carvings. Stack them together or wear solo.",
        "price": 3200,
        "category": "Bangles",
        "image_url": "https://images.unsplash.com/photo-1758995116383-f51775896add?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHw0fHxtZXRhbCUyMGJhbmdsZXN8ZW58MHx8fHwxNzgzNjE3MDUwfDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "name": "Everyday Metal Bangle Set",
        "description": "Lightweight polished metal bangles for daily wear. Comfortable, durable, timeless.",
        "price": 480,
        "category": "Bangles",
        "image_url": "https://images.unsplash.com/photo-1758995119744-6454f091303f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwxfHxtZXRhbCUyMGJhbmdsZXN8ZW58MHx8fHwxNzgzNjE3MDUwfDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "name": "Classic Silver Chain Necklace",
        "description": "Pure sterling-plated snake chain — a timeless staple that complements every outfit.",
        "price": 1780,
        "category": "Silver Plated",
        "image_url": "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwxfHxzaWx2ZXIlMjBqZXdlbHJ5JTIwZWFycmluZ3N8ZW58MHx8fHwxNzgzNjE3MDUwfDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "name": "Boho Silver Anklet Pair",
        "description": "Hand-linked silver-plated anklets with tiny ghungroo bells. Sold as a pair.",
        "price": 990,
        "category": "Silver Plated",
        "image_url": "https://images.unsplash.com/photo-1716461534906-d31a17008801?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwzfHxzaWx2ZXIlMjBqZXdlbHJ5JTIwZWFycmluZ3N8ZW58MHx8fHwxNzgzNjE3MDUwfDA&ixlib=rb-4.1.0&q=85",
    },
]


async def seed_admin():
    email = ADMIN_EMAIL.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "NJE Admin",
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info(f"Seeded admin user: {email}")
    else:
        # keep password in sync with .env
        if not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
            await db.users.update_one(
                {"email": email},
                {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}},
            )
            logger.info(f"Updated admin password for: {email}")


async def seed_demo():
    if not SEED_DEMO:
        return
    if await db.categories.count_documents({}) > 0:
        return
    logger.info("Seeding demo categories and products…")
    cat_map = {}
    for i, c in enumerate(DEMO_CATEGORIES):
        cid = str(uuid.uuid4())
        await db.categories.insert_one({
            "id": cid,
            "name": c["name"],
            "slug": c["slug"],
            "order": i,
            "created_at": now_iso(),
        })
        cat_map[c["name"]] = (cid, c["slug"])
    for p in DEMO_PRODUCTS:
        cid, slug = cat_map[p["category"]]
        item_number = await next_item_number(slug)
        await db.products.insert_one({
            "id": str(uuid.uuid4()),
            "name": p["name"],
            "description": p["description"],
            "price": float(p["price"]),
            "category_id": cid,
            "item_number": item_number,
            "image_url": p["image_url"],
            "image_path": None,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })
    logger.info("Demo seed complete.")


@app.on_event("startup")
async def on_startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.categories.create_index("id", unique=True)
    await db.categories.create_index("slug", unique=True)
    await db.products.create_index("id", unique=True)
    await db.products.create_index("category_id")
    await db.products.create_index("name")

    await seed_admin()
    await seed_demo()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
