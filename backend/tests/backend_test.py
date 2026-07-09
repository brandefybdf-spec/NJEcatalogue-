"""
NJE Catalogue backend API tests.
Covers: health, auth, categories, products (CRUD + filters/search/sort),
meta, analytics and upload endpoints.
"""
import os
import io
import re
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://shop-admin-pro-9.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@nje.com"
ADMIN_PASSWORD = "Admin@123"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(client):
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data
    return data["token"]


@pytest.fixture(scope="session")
def admin_client(client, admin_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {admin_token}"})
    return s


# ---------------- Health ----------------
class TestHealth:
    def test_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"


# ---------------- Auth ----------------
class TestAuth:
    def test_login_success(self, client):
        r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        # httpOnly cookie should be set
        cookie_headers = r.headers.get("set-cookie", "")
        assert "access_token" in cookie_headers.lower()
        assert "httponly" in cookie_headers.lower()

    def test_login_wrong_password(self, client):
        r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_with_bearer(self, admin_client):
        r = admin_client.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_without_token(self, client):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------------- Categories ----------------
class TestCategories:
    def test_list_categories(self, client):
        r = client.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        assert isinstance(cats, list)
        assert len(cats) >= 6
        for c in cats:
            assert "id" in c and "name" in c and "product_count" in c
            assert isinstance(c["product_count"], int)

    def test_create_rename_delete_category(self, admin_client):
        # Create
        name = f"TEST_Cat_{int(time.time())}"
        r = admin_client.post(f"{API}/categories", json={"name": name})
        assert r.status_code == 200, r.text
        cat = r.json()
        assert cat["name"] == name
        assert cat["product_count"] == 0
        cat_id = cat["id"]

        # Verify via list
        r2 = admin_client.get(f"{API}/categories")
        assert any(c["id"] == cat_id for c in r2.json())

        # Rename
        new_name = f"{name}_renamed"
        r3 = admin_client.patch(f"{API}/categories/{cat_id}", json={"name": new_name})
        assert r3.status_code == 200
        assert r3.json()["name"] == new_name

        # Delete (empty category)
        r4 = admin_client.delete(f"{API}/categories/{cat_id}")
        assert r4.status_code == 200

        # Verify gone
        r5 = admin_client.get(f"{API}/categories")
        assert not any(c["id"] == cat_id for c in r5.json())

    def test_create_category_requires_admin(self):
        r = requests.post(f"{API}/categories", json={"name": "Anon Attempt"})
        assert r.status_code == 401

    def test_delete_category_with_products_blocked(self, admin_client):
        cats = admin_client.get(f"{API}/categories").json()
        non_empty = next((c for c in cats if c["product_count"] > 0), None)
        assert non_empty, "Expected at least one seeded category to have products"
        r = admin_client.delete(f"{API}/categories/{non_empty['id']}")
        assert r.status_code == 400

    def test_reorder_categories(self, admin_client):
        cats = admin_client.get(f"{API}/categories").json()
        ids = [c["id"] for c in cats]
        reversed_ids = list(reversed(ids))
        r = admin_client.post(f"{API}/categories/reorder", json={"order": reversed_ids})
        assert r.status_code == 200
        # verify order updated
        cats2 = admin_client.get(f"{API}/categories").json()
        assert [c["id"] for c in cats2] == reversed_ids
        # restore
        admin_client.post(f"{API}/categories/reorder", json={"order": ids})


# ---------------- Meta ----------------
class TestMeta:
    def test_meta(self, client):
        r = client.get(f"{API}/meta")
        assert r.status_code == 200
        data = r.json()
        assert data["currency"] == "INR"
        assert data["min_price"] == 50
        assert data["max_price"] >= 3200


# ---------------- Products: list, filter, search, sort ----------------
class TestProductsCatalogue:
    def test_list_products_returns_seeded(self, client):
        r = client.get(f"{API}/products")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 8
        for p in items:
            assert "id" in p
            assert "category_name" in p
            assert "item_number" in p
            # actual seeded pattern is NJE-<Slug>-<NNN>
            assert re.match(r"^NJE-[A-Za-z0-9]+-\d{3}$", p["item_number"]), \
                f"Unexpected item_number: {p['item_number']}"

    def test_filter_by_category(self, client):
        cats = client.get(f"{API}/categories").json()
        target = next(c for c in cats if c["product_count"] > 0)
        r = client.get(f"{API}/products", params={"categories": target["id"]})
        assert r.status_code == 200
        items = r.json()
        assert all(p["category_id"] == target["id"] for p in items)
        assert len(items) == target["product_count"]

    def test_price_range_filter(self, client):
        r = client.get(f"{API}/products", params={"min_price": 500, "max_price": 1500})
        assert r.status_code == 200
        items = r.json()
        assert all(500 <= p["price"] <= 1500 for p in items)
        assert len(items) > 0

    def test_search(self, client):
        r = client.get(f"{API}/products", params={"search": "silver"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        assert all("silver" in p["name"].lower() for p in items)

    def test_sort_price_asc(self, client):
        r = client.get(f"{API}/products", params={"sort": "price_asc"})
        assert r.status_code == 200
        prices = [p["price"] for p in r.json()]
        assert prices == sorted(prices)

    def test_sort_price_desc(self, client):
        r = client.get(f"{API}/products", params={"sort": "price_desc"})
        assert r.status_code == 200
        prices = [p["price"] for p in r.json()]
        assert prices == sorted(prices, reverse=True)

    def test_get_product_detail(self, client):
        items = client.get(f"{API}/products").json()
        pid = items[0]["id"]
        r = client.get(f"{API}/products/{pid}")
        assert r.status_code == 200
        p = r.json()
        assert p["id"] == pid
        assert "category_name" in p

    def test_get_product_not_found(self, client):
        r = client.get(f"{API}/products/nonexistent-xyz")
        assert r.status_code == 404


# ---------------- Products: admin CRUD & bulk ----------------
class TestProductsAdmin:
    def _get_category(self, admin_client, keep_products=True):
        cats = admin_client.get(f"{API}/categories").json()
        if keep_products:
            return next(c for c in cats if c["product_count"] >= 0)
        return cats[0]

    def test_create_product_and_verify_item_number_pattern(self, admin_client):
        cats = admin_client.get(f"{API}/categories").json()
        # Pick "Earrings"
        cat = next(c for c in cats if c["name"] == "Earrings")

        # Create two products in same category, expect sequential numbering
        r1 = admin_client.post(f"{API}/products", json={
            "name": "TEST_Product_A", "description": "d", "price": 100, "category_id": cat["id"]
        })
        assert r1.status_code == 200, r1.text
        p1 = r1.json()
        assert p1["category_name"] == cat["name"]
        assert re.match(rf"^NJE-{cat['slug']}-\d{{3}}$", p1["item_number"])
        seq1 = int(p1["item_number"].split("-")[-1])

        r2 = admin_client.post(f"{API}/products", json={
            "name": "TEST_Product_B", "description": "d2", "price": 200, "category_id": cat["id"]
        })
        assert r2.status_code == 200
        p2 = r2.json()
        seq2 = int(p2["item_number"].split("-")[-1])
        assert seq2 == seq1 + 1, f"Expected increment: {seq1} -> {seq2}"

        # Verify persistence via GET
        r_get = admin_client.get(f"{API}/products/{p1['id']}")
        assert r_get.status_code == 200
        assert r_get.json()["item_number"] == p1["item_number"]

        # Cleanup
        admin_client.delete(f"{API}/products/{p1['id']}")
        admin_client.delete(f"{API}/products/{p2['id']}")

    def test_update_product(self, admin_client):
        cats = admin_client.get(f"{API}/categories").json()
        cat = cats[0]
        r_c = admin_client.post(f"{API}/products", json={
            "name": "TEST_UpdatePro", "description": "orig", "price": 500, "category_id": cat["id"]
        })
        pid = r_c.json()["id"]
        r_u = admin_client.patch(f"{API}/products/{pid}", json={"name": "TEST_UpdatedName", "price": 777})
        assert r_u.status_code == 200
        upd = r_u.json()
        assert upd["name"] == "TEST_UpdatedName"
        assert upd["price"] == 777
        # persistence check
        r_g = admin_client.get(f"{API}/products/{pid}")
        assert r_g.json()["price"] == 777
        admin_client.delete(f"{API}/products/{pid}")

    def test_update_product_changing_category_regenerates_item_number(self, admin_client):
        cats = admin_client.get(f"{API}/categories").json()
        cat_a = cats[0]
        cat_b = cats[1]
        r_c = admin_client.post(f"{API}/products", json={
            "name": "TEST_MoveCat", "description": "d", "price": 300, "category_id": cat_a["id"]
        })
        p = r_c.json()
        old_item = p["item_number"]
        assert cat_a["slug"] in old_item

        r_u = admin_client.patch(f"{API}/products/{p['id']}", json={"category_id": cat_b["id"]})
        assert r_u.status_code == 200
        new_item = r_u.json()["item_number"]
        assert cat_b["slug"] in new_item
        assert new_item != old_item
        admin_client.delete(f"{API}/products/{p['id']}")

    def test_delete_product(self, admin_client):
        cats = admin_client.get(f"{API}/categories").json()
        r_c = admin_client.post(f"{API}/products", json={
            "name": "TEST_ToDelete", "description": "", "price": 100, "category_id": cats[0]["id"]
        })
        pid = r_c.json()["id"]
        r_d = admin_client.delete(f"{API}/products/{pid}")
        assert r_d.status_code == 200
        # Verify gone
        r_g = admin_client.get(f"{API}/products/{pid}")
        assert r_g.status_code == 404

    def test_bulk_delete(self, admin_client):
        cats = admin_client.get(f"{API}/categories").json()
        ids = []
        for i in range(3):
            r = admin_client.post(f"{API}/products", json={
                "name": f"TEST_Bulk_{i}", "description": "", "price": 100, "category_id": cats[0]["id"]
            })
            ids.append(r.json()["id"])
        r_bd = admin_client.post(f"{API}/products/bulk-delete", json={"ids": ids})
        assert r_bd.status_code == 200
        assert r_bd.json()["deleted"] == 3

    def test_bulk_update_category(self, admin_client):
        cats = admin_client.get(f"{API}/categories").json()
        cat_a, cat_b = cats[0], cats[1]
        r = admin_client.post(f"{API}/products", json={
            "name": "TEST_BulkMove", "description": "", "price": 100, "category_id": cat_a["id"]
        })
        pid = r.json()["id"]
        r_bu = admin_client.post(f"{API}/products/bulk-update-category", json={
            "ids": [pid], "category_id": cat_b["id"]
        })
        assert r_bu.status_code == 200
        assert r_bu.json()["updated"] == 1
        # Verify category changed AND item_number regenerated
        r_g = admin_client.get(f"{API}/products/{pid}")
        p = r_g.json()
        assert p["category_id"] == cat_b["id"]
        assert cat_b["slug"] in p["item_number"]
        admin_client.delete(f"{API}/products/{pid}")

    def test_create_product_requires_admin(self, admin_client):
        cats = admin_client.get(f"{API}/categories").json()
        r = requests.post(f"{API}/products", json={
            "name": "Anon", "description": "", "price": 10, "category_id": cats[0]["id"]
        })
        assert r.status_code == 401


# ---------------- Analytics ----------------
class TestAnalytics:
    def test_analytics_admin(self, admin_client):
        r = admin_client.get(f"{API}/analytics")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data["total_products"], int)
        assert isinstance(data["total_categories"], int)
        assert data["total_categories"] >= 6
        assert isinstance(data["per_category"], list) and len(data["per_category"]) >= 6
        for row in data["per_category"]:
            assert "name" in row and "count" in row
        assert isinstance(data["price_distribution"], list) and len(data["price_distribution"]) == 6
        for row in data["price_distribution"]:
            assert "range" in row and "count" in row

    def test_analytics_non_admin_blocked(self):
        r = requests.get(f"{API}/analytics")
        assert r.status_code == 401


# ---------------- Upload ----------------
# Minimal 1x1 PNG bytes
PNG_1x1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
    b"\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01"
    b"\xc7\xa9\r\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


class TestUpload:
    def test_upload_requires_admin(self, client):
        # Multipart without Content-Type header override — use a fresh session
        s = requests.Session()
        files = {"file": ("t.png", io.BytesIO(PNG_1x1), "image/png")}
        r = s.post(f"{API}/upload", files=files)
        assert r.status_code == 401

    def test_upload_and_fetch(self, admin_token):
        # Multipart upload — do not send explicit Content-Type
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {admin_token}"})
        files = {"file": ("test.png", io.BytesIO(PNG_1x1), "image/png")}
        r = s.post(f"{API}/upload", files=files)
        if r.status_code == 503:
            pytest.skip("Object storage unavailable in this env")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "path" in data and "url" in data
        assert data["url"].startswith("/api/files/")
        # Fetch the file
        r2 = requests.get(f"{BASE_URL}{data['url']}")
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("image/")

    def test_upload_invalid_type(self, admin_token):
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {admin_token}"})
        files = {"file": ("t.txt", io.BytesIO(b"hello"), "text/plain")}
        r = s.post(f"{API}/upload", files=files)
        assert r.status_code == 400



# ---------------- PDF Export ----------------
class TestPdfExport:
    """New feature: GET /api/products/export-pdf (admin only)."""

    def test_export_pdf_requires_auth(self):
        r = requests.get(f"{API}/products/export-pdf", params={"style": "catalogue"})
        assert r.status_code == 401

    def test_export_pdf_catalogue_style(self, admin_client):
        r = admin_client.get(f"{API}/products/export-pdf", params={"style": "catalogue"})
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF", f"Missing PDF magic bytes: {r.content[:8]!r}"
        assert len(r.content) > 500, "Catalogue PDF unexpectedly tiny"
        cd = r.headers.get("content-disposition", "").lower()
        assert "nje-catalogue-" in cd
        assert ".pdf" in cd

    def test_export_pdf_pricelist_style(self, admin_client):
        r = admin_client.get(f"{API}/products/export-pdf", params={"style": "pricelist"})
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"
        cd = r.headers.get("content-disposition", "").lower()
        assert "nje-pricelist-" in cd

    def test_export_pdf_default_style_is_catalogue(self, admin_client):
        r = admin_client.get(f"{API}/products/export-pdf")
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"
        assert "nje-catalogue-" in r.headers.get("content-disposition", "").lower()

    def test_export_pdf_invalid_style_rejected(self, admin_client):
        r = admin_client.get(f"{API}/products/export-pdf", params={"style": "bogus"})
        # Query regex validation -> 422
        assert r.status_code in (400, 422), r.text

    def test_export_pdf_filter_by_category_id(self, admin_client):
        cats = admin_client.get(f"{API}/categories").json()
        target = next(c for c in cats if c["product_count"] > 0)
        r = admin_client.get(
            f"{API}/products/export-pdf",
            params={"style": "pricelist", "category_id": target["id"]},
        )
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"

    def test_export_pdf_filter_by_categories_multi(self, admin_client):
        cats = admin_client.get(f"{API}/categories").json()
        # combine first two categories that have products
        non_empty = [c for c in cats if c["product_count"] > 0][:2]
        ids = ",".join(c["id"] for c in non_empty)
        r = admin_client.get(
            f"{API}/products/export-pdf",
            params={"style": "pricelist", "categories": ids},
        )
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"

    def test_export_pdf_price_range_filter(self, admin_client):
        r = admin_client.get(
            f"{API}/products/export-pdf",
            params={"style": "pricelist", "min_price": 50, "max_price": 100000},
        )
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"

    def test_export_pdf_search_filter(self, admin_client):
        r = admin_client.get(
            f"{API}/products/export-pdf",
            params={"style": "pricelist", "search": "silver"},
        )
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"

    def test_export_pdf_zero_matches_returns_404(self, admin_client):
        r = admin_client.get(
            f"{API}/products/export-pdf",
            params={"style": "pricelist", "search": "zzz_no_match_xyz_abcdef"},
        )
        assert r.status_code == 404
        detail = r.json().get("detail", "")
        assert "No products match" in detail

    def test_export_pdf_ids_param(self, admin_client):
        # Pick two real product ids
        products = admin_client.get(f"{API}/products").json()
        ids = ",".join(p["id"] for p in products[:2])
        r = admin_client.get(
            f"{API}/products/export-pdf",
            params={"style": "pricelist", "ids": ids},
        )
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"

    def test_export_pdf_ids_all_invalid_returns_404(self, admin_client):
        r = admin_client.get(
            f"{API}/products/export-pdf",
            params={"style": "pricelist", "ids": "nope1,nope2"},
        )
        assert r.status_code == 404

    def test_regression_get_product_by_id_still_works(self, client):
        """Ensure /products/{product_id} route not shadowed by /products/export-pdf."""
        items = client.get(f"{API}/products").json()
        assert items, "No products found for regression test"
        pid = items[0]["id"]
        r = client.get(f"{API}/products/{pid}")
        assert r.status_code == 200
        assert r.json()["id"] == pid

    def test_regression_get_product_export_pdf_literal_not_treated_as_id(self, client):
        """Public (unauth) access to /products/export-pdf should be 401 (admin gated),
        NOT 404 (which would indicate it's being treated as a product id)."""
        r = requests.get(f"{API}/products/export-pdf")
        assert r.status_code == 401, f"Expected 401 (auth), got {r.status_code} — route may be shadowed"
