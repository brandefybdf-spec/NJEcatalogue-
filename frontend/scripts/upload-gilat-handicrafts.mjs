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

const CATEGORY_ID = "category-147fe434-734d-4023-9496-12cc3398bec5"; // Silver Plated

// Folder to read images from + the ordered list of slugs (filename minus
// .webp) to upload. Change these two for each new batch of images.
const IMAGE_DIR = path.join(__dirname, "..", "public", "silver plated part 2");

// This category's existing item numbers are bare "SP<n>" (no NJE prefix),
// unlike Gilat Handcrafts' "NJE-Gilat-###". Set to match whatever the
// category already uses.
const ITEM_PREFIX = "SP";
const ITEM_PAD = 0; // 0 = no zero-padding (SP17, not SP017)

const FILES_IN_ORDER = [
  "pink-jar-set",
  "sage-jar-set",
  "rose-jar-set",
  "classic-jar-set",
  "olive-lattice-set",
  "petal-vine-tray",
  "rose-clutch-box",
  "blossom-tier-dish",
  "crystal-flower-stand",
  "rose-tealight-single",
  "rose-tealight-duo",
  "rose-tealight-trio",
  "floral-gem-clutch",
  "floral-tray-bowl",
  "gem-floral-frame",
  "floral-candle-pair",
  "floral-cake-stand",
  "floral-pedestal-bowl",
  "floral-trio-dish",
  "pierced-round-bowl",
  "pierced-rect-dish",
  "ornate-rect-dish",
  "lotus-hammered-bowl",
  "petal-edge-bowl",
  "rose-finial-bowl",
  "garland-oval-bowl",
  "engraved-round-tray",
  "cherub-center-bowl",
  "engraved-rect-tray",
  "cherub-shell-bowl",
  "gold-flower-mirror-tray",
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
  console.log(`Starting from ${ITEM_PREFIX}${String(counter + 1).padStart(ITEM_PAD, "0")}\n`);

  let ok = 0;
  const failed = [];

  for (const slug of FILES_IN_ORDER) {
    const filePath = path.join(IMAGE_DIR, `${slug}.webp`);
    try {
      const buffer = fs.readFileSync(filePath);
      const asset = await client.assets.upload("image", buffer, { filename: `${slug}.webp` });

      counter += 1;
      const itemNumber = `${ITEM_PREFIX}${String(counter).padStart(ITEM_PAD, "0")}`;
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
