// One-time upload: new Gilat Handicrafts product images -> Sanity.
// Uploads each image and creates a product doc (price 0, item numbers
// continuing the existing NJE-Gilat-### sequence for this category).
//
// Usage: node scripts/upload-gilat-handicrafts.mjs
import fs from "node:fs";
import path from "node:path";
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

const CATEGORY_ID = "category-e1972a6a-5954-4e18-a005-069ebd11f76a"; // Gilat Handcrafts
const IMAGE_DIR = path.join(
  __dirname,
  "..",
  "public",
  "gilat handicraft new product images"
);

const FILES_IN_ORDER = [
  "ram-temple",
  "kamdhenu-cow",
  "elephant-frame",
  "rose-frame",
  "ganesha-bust",
  "krishna-swing",
  "radha-krishna",
  "elephant-bowls",
  "gift-set",
  "peacock-diya",
  "turtle-crystal",
  "diya-pair",
  "gau-mata",
  "shyam-flags",
  "elephant-dish",
  "peacock-candle",
  "horse-carriage",
  "ram-darbar",
  "leaf-platter",
  "lakshmi-idol",
  "elephant-pair",
  "peacock-bowl",
  "elephant-howdah",
  "shiva-idol",
];

function titleCase(slug) {
  return slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

async function nextItemNumber() {
  const existing = await client.fetch(
    `*[_type == "product" && category._ref == $categoryRef && defined(itemNumber)].itemNumber`,
    { categoryRef: CATEGORY_ID }
  );
  let max = 0;
  for (const num of existing) {
    const m = /(\d+)\s*$/.exec(num || "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

async function main() {
  let counter = await nextItemNumber();
  console.log(`Starting from NJE-Gilat-${String(counter + 1).padStart(3, "0")}\n`);

  let ok = 0;
  const failed = [];

  for (const slug of FILES_IN_ORDER) {
    const filePath = path.join(IMAGE_DIR, `${slug}.webp`);
    try {
      const buffer = fs.readFileSync(filePath);
      const asset = await client.assets.upload("image", buffer, { filename: `${slug}.webp` });

      counter += 1;
      const itemNumber = `NJE-Gilat-${String(counter).padStart(3, "0")}`;
      const itemSlug = itemNumber.toLowerCase();

      await client.create({
        _type: "product",
        name: titleCase(slug),
        description: "",
        price: 0,
        category: { _type: "reference", _ref: CATEGORY_ID },
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
