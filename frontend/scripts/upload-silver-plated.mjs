// One-time upload: new Silver Plated gifting-item images -> Sanity.
// Uploads each image and creates a product doc (price 0, item numbers
// SP1, SP2, ... continuing any existing SP### sequence). Creates the
// "Silver Plated" category if it doesn't already exist.
//
// Usage: node scripts/upload-silver-plated.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@sanity/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env.migration") });

const { SANITY_PROJECT_ID, SANITY_DATASET, SANITY_WRITE_TOKEN } = process.env;
for (const [key, val] of Object.entries({ SANITY_PROJECT_ID, SANITY_DATASET, SANITY_WRITE_TOKEN })) {
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

const CATEGORY_NAME = "Silver Plated";
const IMAGE_DIR = path.join(__dirname, "..", "public", "silver plated product images");

const FILES_IN_ORDER = [
  "lotus-diya",
  "ganesh-ring",
  "twin-diya",
  "swan-diya",
  "amber-bowl",
  "maroon-bowl",
  "gold-bowl",
  "five-diya",
  "flamingo-bowl",
  "malachite-mirror",
  "malachite-bowl",
  "square-tray",
  "rectangle-tray",
  "leaf-tray",
  "tiered-stand",
  "hex-tray",
];

function titleCase(slug) {
  return slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

async function getOrCreateCategory() {
  const existing = await client.fetch(
    `*[_type == "category" && name == $name][0]{ "id": _id }`,
    { name: CATEGORY_NAME }
  );
  if (existing) {
    console.log(`Using existing category "${CATEGORY_NAME}" (${existing.id})`);
    return existing.id;
  }

  const maxOrder = await client.fetch(`math::max(*[_type == "category"].order)`);
  const id = `category-${crypto.randomUUID()}`;
  await client.create({
    _id: id,
    _type: "category",
    name: CATEGORY_NAME,
    slug: { _type: "slug", current: "silver-plated" },
    order: (maxOrder ?? 0) + 1,
  });
  console.log(`Created category "${CATEGORY_NAME}" (${id})`);
  return id;
}

async function nextSpNumber() {
  const existing = await client.fetch(
    `*[_type == "product" && defined(itemNumber) && itemNumber match "SP*"].itemNumber`
  );
  let max = 0;
  for (const num of existing) {
    const m = /^SP(\d+)$/.exec(num || "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

async function main() {
  const categoryId = await getOrCreateCategory();
  let counter = await nextSpNumber();
  console.log(`Starting from SP${counter + 1}\n`);

  let ok = 0;
  const failed = [];

  for (const slug of FILES_IN_ORDER) {
    const filePath = path.join(IMAGE_DIR, `${slug}.webp`);
    try {
      const buffer = fs.readFileSync(filePath);
      const asset = await client.assets.upload("image", buffer, { filename: `${slug}.webp` });

      counter += 1;
      const itemNumber = `SP${counter}`;
      const itemSlug = itemNumber.toLowerCase();

      await client.create({
        _type: "product",
        name: titleCase(slug),
        description: "",
        price: 0,
        category: { _type: "reference", _ref: categoryId },
        image: { _type: "image", asset: { _type: "reference", _ref: asset._id } },
        itemNumber,
        slug: { _type: "slug", current: itemSlug },
        createdAt: new Date().toISOString(),
      });

      ok++;
      console.log(`  ${itemNumber}: ${titleCase(slug)}`);
    } catch (e) {
      console.error(`  FAILED ${slug}: ${e.message}`);
      failed.push(slug);
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Uploaded: ${ok} / ${FILES_IN_ORDER.length}`);
  if (failed.length) {
    console.log(`Failed (${failed.length}):`, failed.join(", "));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("Upload failed:", e);
  process.exit(1);
});
