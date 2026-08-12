import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

export const projectId = process.env.REACT_APP_SANITY_PROJECT_ID;
export const dataset = process.env.REACT_APP_SANITY_DATASET || "production";

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: true,
});

const builder = imageUrlBuilder(sanityClient);

/**
 * Build a resized/optimized Sanity image URL. `width` is the CSS display
 * width in px; the actual asset requested is scaled by devicePixelRatio
 * (capped at 2x) so it stays sharp on retina screens instead of looking soft.
 */
export function urlForImage(source, width) {
  if (!source) return "";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let img = builder.image(source).auto("format").quality(80).fit("max");
  if (width) img = img.width(Math.round(width * dpr));
  return img.url();
}
