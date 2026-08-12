// One-time backfill: gives every existing product a URL slug derived from
// its item number (e.g. "NJE-Enamel-Gilat-001" -> "nje-enamel-gilat-001"),
// since products didn't have a slug field until now.
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@sanity/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env.migration") });

const { SANITY_PROJECT_ID, SANITY_DATASET, SANITY_WRITE_TOKEN } = process.env;
const APPLY = process.argv.includes("--apply");

const client = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  token: SANITY_WRITE_TOKEN,
  apiVersion: "2024-01-01",
  useCdn: false,
});

function slugify(itemNumber) {
  return itemNumber
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const products = await client.fetch(`*[_type == "product" && !defined(slug.current)]{_id, itemNumber}`);
  console.log(`${products.length} product(s) missing a slug.`);

  const seen = new Set();
  const tx = client.transaction();
  for (const p of products) {
    let slug = slugify(p.itemNumber);
    let n = 2;
    while (seen.has(slug)) {
      slug = `${slugify(p.itemNumber)}-${n++}`;
    }
    seen.add(slug);
    console.log(`  ${p.itemNumber} -> ${slug}`);
    if (APPLY) tx.patch(p._id, { set: { slug: { _type: "slug", current: slug } } });
  }

  if (APPLY && products.length) {
    await tx.commit();
    console.log(`Applied ${products.length} slug(s).`);
  } else if (!APPLY) {
    console.log("Preview only — pass --apply to write these changes.");
  }
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
