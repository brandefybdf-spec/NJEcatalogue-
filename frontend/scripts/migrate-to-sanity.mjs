// One-time migration: copies categories + products from the live NJE
// FastAPI/MongoDB backend into Sanity, including re-uploading each
// product image. Safe to re-run — every document is created with a
// deterministic _id derived from the old Mongo id, so re-running just
// overwrites the same documents instead of duplicating them.
//
// Usage: node scripts/migrate-to-sanity.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@sanity/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env.migration") });

const { SANITY_PROJECT_ID, SANITY_DATASET, SANITY_WRITE_TOKEN, BACKEND_URL } = process.env;

for (const [key, val] of Object.entries({ SANITY_PROJECT_ID, SANITY_DATASET, SANITY_WRITE_TOKEN, BACKEND_URL })) {
  if (!val) {
    console.error(`Missing ${key} in scripts/.env.migration`);
    process.exit(1);
  }
}

const client = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  token: SANITY_WRITE_TOKEN,
  apiVersion: "2024-01-01",
  useCdn: false,
});

async function fetchJson(pathname) {
  const res = await fetch(`${BACKEND_URL}${pathname}`);
  if (!res.ok) throw new Error(`${pathname} -> HTTP ${res.status}`);
  return res.json();
}

async function migrateCategories() {
  const categories = await fetchJson("/api/categories");
  console.log(`Fetched ${categories.length} categories from live backend.`);

  const idMap = new Map(); // old mongo id -> sanity _id
  for (const cat of categories) {
    const sanityId = `category-${cat.id}`;
    idMap.set(cat.id, sanityId);
    await client.createOrReplace({
      _id: sanityId,
      _type: "category",
      name: cat.name,
      slug: { _type: "slug", current: cat.slug || cat.name },
      order: cat.order ?? 0,
    });
    console.log(`  category: ${cat.name}`);
  }
  return idMap;
}

async function uploadImageFromUrl(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image fetch failed (${res.status}): ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const asset = await client.assets.upload("image", buffer, { filename });
  return asset._id;
}

async function migrateProducts(categoryIdMap) {
  const products = await fetchJson("/api/products?limit=500");
  console.log(`Fetched ${products.length} products from live backend.`);

  let ok = 0;
  let failed = [];

  for (const p of products) {
    const sanityId = `product-${p.id}`;
    const sanityCategoryId = categoryIdMap.get(p.category_id);
    if (!sanityCategoryId) {
      console.warn(`  SKIP ${p.name}: unknown category_id ${p.category_id}`);
      failed.push(p.name);
      continue;
    }
    try {
      let imageField;
      if (p.image_url) {
        const filename = p.image_url.split("/").pop();
        const assetId = await uploadImageFromUrl(p.image_url, filename);
        imageField = { _type: "image", asset: { _type: "reference", _ref: assetId } };
      }
      await client.createOrReplace({
        _id: sanityId,
        _type: "product",
        name: p.name,
        description: p.description || "",
        price: p.price,
        itemNumber: p.item_number,
        category: { _type: "reference", _ref: sanityCategoryId },
        ...(imageField ? { image: imageField } : {}),
        createdAt: p.created_at,
      });
      ok++;
      console.log(`  product: ${p.name} (${p.item_number})`);
    } catch (e) {
      console.error(`  FAILED ${p.name}: ${e.message}`);
      failed.push(p.name);
    }
  }

  return { total: products.length, ok, failed };
}

async function main() {
  console.log(`Migrating from ${BACKEND_URL} into Sanity project ${SANITY_PROJECT_ID}/${SANITY_DATASET}\n`);
  const categoryIdMap = await migrateCategories();
  console.log("");
  const result = await migrateProducts(categoryIdMap);

  console.log("\n--- Summary ---");
  console.log(`Categories migrated: ${categoryIdMap.size}`);
  console.log(`Products migrated:   ${result.ok} / ${result.total}`);
  if (result.failed.length) {
    console.log(`Failed (${result.failed.length}):`, result.failed.join(", "));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
