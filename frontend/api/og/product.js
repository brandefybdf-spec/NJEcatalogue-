// Serves a small HTML document with product-specific Open Graph tags to link
// preview crawlers (WhatsApp, Facebook, Telegram, Slack, etc.).
//
// The site itself is a client-rendered React SPA, so a crawler hitting
// /product/:slug directly would only ever see the empty index.html shell —
// no og:image, no product name. vercel.json rewrites requests from known
// crawler user-agents to this function instead (real browsers still get the
// SPA), so a shared product link/WhatsApp preview shows that product's own
// photo instead of nothing.
const { createClient } = require("@sanity/client");

const PROJECT_ID = process.env.REACT_APP_SANITY_PROJECT_ID || "m3h5dz4q";
const DATASET = process.env.REACT_APP_SANITY_DATASET || "production";

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: "2024-01-01",
  useCdn: true,
});

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = async (req, res) => {
  const slug = req.query.slug;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const pageUrl = `https://${host}/product/${slug}`;

  if (!slug) {
    res.status(400).send("Missing slug");
    return;
  }

  let product = null;
  try {
    product = await client.fetch(
      `*[_type == "product" && slug.current == $slug][0]{
        name,
        itemNumber,
        size,
        "imageUrl": image.asset->url
      }`,
      { slug }
    );
  } catch (err) {
    console.error("OG product fetch failed:", err.message);
  }

  if (!product) {
    res.status(404).send("Product not found");
    return;
  }

  const title = `${product.name} — NJE Wholesale`;
  const descriptionParts = [
    product.itemNumber ? `SKU ${product.itemNumber}` : null,
    product.size ? `Size ${product.size}` : null,
    "Wholesale & sample pcs enquiry on WhatsApp.",
  ].filter(Boolean);
  const description = descriptionParts.join(" · ");

  // Sanity's asset CDN can resize/reformat on the fly; force a JPG since not
  // every link-preview crawler negotiates webp correctly.
  const ogImage = product.imageUrl
    ? `${product.imageUrl}?w=1200&h=630&fit=crop&fm=jpg&q=80`
    : `https://${host}/nje-logo.webp`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:type" content="product" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(ogImage)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${escapeHtml(pageUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(ogImage)}" />
<link rel="canonical" href="${escapeHtml(pageUrl)}" />
<meta http-equiv="refresh" content="0; url=${escapeHtml(pageUrl)}" />
</head>
<body></body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(html);
};
