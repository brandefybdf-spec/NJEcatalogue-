// One-time cleanup: fixes inconsistent capitalization/spacing in product
// and category names (e.g. "EG5" -> "EG 5", "peacocktray" -> "Peacock Tray",
// "Oxidised ring" -> "Oxidised Ring", "bangles" -> "Bangles").
//
// Usage:
//   node scripts/normalize-names.mjs            (preview only, no writes)
//   node scripts/normalize-names.mjs --apply     (actually writes the changes)
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

// Known concatenated names that need a manual word split — can't be
// generically inferred from casing/digits alone.
const MANUAL_OVERRIDES = {
  peacocktray: "Peacock Tray",
};

function normalizeName(raw) {
  const key = raw.trim().toLowerCase();
  if (MANUAL_OVERRIDES[key]) return MANUAL_OVERRIDES[key];

  let s = raw.trim().replace(/\s+/g, " ");
  // Insert a space between letters and digits: "EG5" -> "EG 5", "P1" -> "P 1"
  s = s.replace(/([A-Za-z])(\d)/g, "$1 $2").replace(/(\d)([A-Za-z])/g, "$1 $2");

  s = s
    .split(" ")
    .map((word) => {
      if (/^\d+$/.test(word)) return word; // pure number, leave as-is
      if (/^[A-Z]+$/.test(word) && word.length <= 4) return word; // short code like EG, HI, FVKJ — keep
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
  return s;
}

async function processType(type) {
  const docs = await client.fetch(`*[_type == $type]{_id, name}`, { type });
  const changes = docs
    .map((d) => ({ ...d, newName: normalizeName(d.name) }))
    .filter((d) => d.newName !== d.name);

  console.log(`\n${type}: ${changes.length} of ${docs.length} need changes`);
  for (const c of changes) {
    console.log(`  "${c.name}" -> "${c.newName}"`);
  }

  if (APPLY && changes.length) {
    const tx = client.transaction();
    for (const c of changes) {
      tx.patch(c._id, { set: { name: c.newName } });
    }
    await tx.commit();
    console.log(`  Applied ${changes.length} change(s) to ${type}.`);
  }
  return changes.length;
}

async function main() {
  console.log(APPLY ? "Applying changes..." : "Preview only (pass --apply to actually write changes)");
  const catCount = await processType("category");
  const prodCount = await processType("product");
  console.log(`\nTotal: ${catCount + prodCount} change(s) ${APPLY ? "applied" : "would be applied"}.`);

  console.log(`\nNote: "bangles" and "Bangles" are two separate category documents.`);
  console.log(`This script only fixes capitalization — it does not merge them.`);
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
