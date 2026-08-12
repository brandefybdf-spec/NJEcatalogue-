import { sanityClient } from "./client";

const PRODUCT_PROJECTION = `{
  "id": _id,
  name,
  description,
  price,
  "item_number": itemNumber,
  image,
  "image_lqip": image.asset->metadata.lqip,
  "category_id": category->_id,
  "category_name": category->name
}`;

export async function getCategories() {
  return sanityClient.fetch(
    `*[_type == "category"] | order(order asc) {
      "id": _id,
      name,
      "slug": slug.current,
      order,
      "product_count": count(*[_type == "product" && references(^._id)])
    }`
  );
}

const SORT_TO_GROQ = {
  newest: "order(_createdAt desc)",
  name_asc: "order(name asc)",
  name_desc: "order(name desc)",
};

export async function getProducts({ categoryIds, minPrice, maxPrice, search, sort } = {}) {
  const filters = ['_type == "product"'];
  const params = {};

  if (categoryIds && categoryIds.length) {
    filters.push("category._ref in $categoryIds");
    params.categoryIds = categoryIds;
  }
  if (minPrice !== undefined && minPrice !== null) {
    filters.push("price >= $minPrice");
    params.minPrice = minPrice;
  }
  if (maxPrice !== undefined && maxPrice !== null) {
    filters.push("price <= $maxPrice");
    params.maxPrice = maxPrice;
  }
  if (search) {
    filters.push("name match $search");
    params.search = `*${search}*`;
  }

  const order = SORT_TO_GROQ[sort] || SORT_TO_GROQ.newest;
  const query = `*[${filters.join(" && ")}] | ${order} ${PRODUCT_PROJECTION}`;
  return sanityClient.fetch(query, params);
}

/** Fetch specific products by item number, in the order requested. */
export async function getProductsByItemNumbers(itemNumbers) {
  const results = await sanityClient.fetch(
    `*[_type == "product" && itemNumber in $itemNumbers] ${PRODUCT_PROJECTION}`,
    { itemNumbers }
  );
  return itemNumbers
    .map((num) => results.find((p) => p.item_number === num))
    .filter(Boolean);
}

export async function getProduct(id) {
  return sanityClient.fetch(`*[_type == "product" && _id == $id][0] ${PRODUCT_PROJECTION}`, { id });
}

export async function getMeta() {
  const prices = await sanityClient.fetch(`*[_type == "product"].price`);
  if (!prices.length) return { min_price: 0, max_price: 0, app_name: "NJE Catalogue", currency: "INR" };
  return {
    min_price: Math.floor(Math.min(...prices)),
    max_price: Math.ceil(Math.max(...prices)),
    app_name: "NJE Catalogue",
    currency: "INR",
  };
}
